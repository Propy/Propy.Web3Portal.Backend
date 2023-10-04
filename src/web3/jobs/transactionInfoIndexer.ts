import axios from 'axios';

import {
  debugMode,
  NETWORK_TO_ALCHEMY_ENDPOINT,
} from '../../constants';

import {
  sliceArrayIntoChunks,
  sleep,
} from '../../utils';

import {
	createLog,
  createErrorLog,
} from '../../logger';

const maxBatchSize = 1000;

//@ts-ignore
export const fetchTransactionBatchRetryOnFailure = async (txHashBatch : string[], network: string, retryCount: number = 0) => {
  let url = NETWORK_TO_ALCHEMY_ENDPOINT[network];
  if(url) {
    if (debugMode) {
      createLog({url})
    }
    let postBody = txHashBatch.map((txHash) => ({
      jsonrpc: "2.0",
      id: txHash,
      method: "eth_getTransactionByHash",
      params: [ txHash ],
    }));
    // @ts-ignore
    let results = await axios.post(
      url,
      JSON.stringify(postBody),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    .then(function (response) {
      // handle success
      if(debugMode) {
        createLog(response, response?.data)
      }
      // check for errors
      if(response?.data) {
        let hasError = response?.data.find((item: any) => item.error);
        if(hasError) {
          throw new Error(`response contained errors: ${hasError}`)
        }
      }
      return response?.data ? response?.data : [];
    })
    .catch(async (e: any) => {
      retryCount++;
      if(retryCount < 5) {
        createErrorLog(`error fetching transaction data at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000));
        return await fetchTransactionBatchRetryOnFailure(txHashBatch, network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching transaction data at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return [];
    })
    return results;
  }
  return [];
}

//@ts-ignore
export const fetchBlockInfoBatchRetryOnFailure = async (blockNumberBatch : string[], network: string, retryCount: number = 0) => {
  createLog(`Fetching block info for ${blockNumberBatch.length} blocks on ${network}`);
  let url = NETWORK_TO_ALCHEMY_ENDPOINT[network];
  if(url) {
    if (debugMode) {
      createLog({url})
    }
    let postBody = blockNumberBatch.map((blockNumber) => ({
      jsonrpc: "2.0",
      id: blockNumber,
      method: "eth_getBlockByNumber",
      params: [ blockNumber, false ],
    }));
    if (debugMode) {
      createLog({postBody: JSON.stringify(postBody)})
    }
    // @ts-ignore
    let results = await axios.post(
      url,
      JSON.stringify(postBody),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    .then(function (response) {
      // handle success
      if(debugMode) {
        createLog(response, response?.data)
      }
      // check for errors
      if(response?.data) {
        let hasError = response?.data.find((item: any) => item.error);
        if(hasError) {
          createErrorLog({hasError});
          throw new Error(hasError)
        }
      }
      return response?.data ? response?.data : [];
    })
    .catch(async (e: any) => {
      retryCount++;
      if(retryCount < 5) {
        createErrorLog(`error fetching block number info at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000));
        return await fetchBlockInfoBatchRetryOnFailure(blockNumberBatch, network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching block number info at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return [];
    })
    return results;
  }
  return [];
}

export const transactionInfoIndexer = async (
  transactionHashes: string[],
  network: string,
  meta: string,
) => {

  let transactionHashesCount = transactionHashes.length;

  createLog({"transactionInfoIndexer transactionHashesCount:": transactionHashesCount})

  if(transactionHashesCount > 0) {

    let batches = sliceArrayIntoChunks(transactionHashes, maxBatchSize);

    let currentBatch = 0;
    let transactions : any[] = [];
    for(let batch of batches) {

      let startTime = new Date().getTime();

      currentBatch++;

      // log batch status
      createLog(`transactionInfoIndexer fetching batch ${currentBatch} of ${batches.length} for ${meta}`);

      // fetch batch
      await sleep(1000);
      let transactionInfoBatch = await fetchTransactionBatchRetryOnFailure(batch, network);
      // fetch block timestamps
      const blockNumbers : string[] = transactionInfoBatch.map((item: any) => item.result.blockNumber);
      const uniqueBlockNumbers = Array.from(new Set(blockNumbers));
      await sleep(2000);
      const blockInfoBatch = await fetchBlockInfoBatchRetryOnFailure(uniqueBlockNumbers, network);
      let blockNumberToBlockInfo : {[key: string]: any} = {};
      for(let blockInfoEntry of blockInfoBatch) {
        blockNumberToBlockInfo[blockInfoEntry.id] = blockInfoEntry?.result?.timestamp ? Number(blockInfoEntry.result.timestamp).toString() : 0;
      }
      transactionInfoBatch = transactionInfoBatch.map((transactionInfoEntry: any) => {
        if(transactionInfoEntry?.result?.blockNumber && blockNumberToBlockInfo[transactionInfoEntry?.result?.blockNumber]) {
          transactionInfoEntry.result.block_timestamp = blockNumberToBlockInfo[transactionInfoEntry?.result?.blockNumber];
        }
        return transactionInfoEntry.result;
      })
      transactions = [...transactions, ...(transactionInfoBatch ? transactionInfoBatch : [])];

      // log batch status
      createLog(`eventIndexer fetched batch ${currentBatch} of ${batches.length} (${new Date().getTime() - startTime}ms)`);

    }

    return transactions ? transactions : [];

  }
  
  return [];

}