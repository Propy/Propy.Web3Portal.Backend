import axios from 'axios';

import { utils } from 'ethers';

import {
  debugMode,
  NETWORK_TO_ENDPOINT,
  MAX_RPC_BATCH_SIZE,
} from '../../constants';

import {
  sliceArrayIntoChunks,
  sleep,
} from '../../utils';

import {
	createLog,
  createErrorLog,
} from '../../logger';

const maxBatchSize = MAX_RPC_BATCH_SIZE;

//@ts-ignore
export const fetchTransactionBatchRetryOnFailure = async (txHashBatch : string[], network: string, retryCount: number = 0) => {
  let url = NETWORK_TO_ENDPOINT[network];
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
    try {
      // @ts-ignore
      let results = await axios.post(
        url,
        JSON.stringify(postBody),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if(debugMode) {
        createLog(results, results?.data)
      }
      // check for errors
      if(results?.data) {
        let hasError = results?.data.find((item: any) => item.error);
        if(hasError) {
          throw new Error(`response contained errors: ${hasError}`)
        }
      }
      return results?.data ? results?.data : [];
    } catch (e) {
      retryCount++;
      if(retryCount < 10) {
        createErrorLog(`error fetching transaction data at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, JSON.stringify(postBody));
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await fetchTransactionBatchRetryOnFailure(txHashBatch, network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching transaction data at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return [];
    }
  }
  return [];
}

//@ts-ignore
export const fetchBlockInfoBatchRetryOnFailure = async (blockNumberBatch : string[], network: string, rawLatestBlockNumberWithinRangeLimit: string[], retryCount: number = 0) => {
  createLog(`Fetching block info for ${blockNumberBatch.length} blocks on ${network}`);
  let url = NETWORK_TO_ENDPOINT[network];
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
      createLog({postBody: JSON.stringify(postBody), blockNumberBatch, rawLatestBlockNumberWithinRangeLimit})
    }
    try {
      // @ts-ignore
      let results = await axios.post(
        url,
        JSON.stringify(postBody),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
      // handle success
      if(debugMode) {
        createLog(results, results?.data)
      }
      // check for errors
      if(results?.data) {
        let hasError = results?.data.find((item: any) => item.error);
        if(hasError) {
          createLog({postBody: JSON.stringify(postBody), blockNumberBatch, rawLatestBlockNumberWithinRangeLimit})
          createErrorLog({hasError});
          throw new Error(hasError)
        }
      }
      return results?.data ? results?.data : [];
    } catch (e) {
      retryCount++;
      if(retryCount < 10) {
        createErrorLog(`error fetching block info (transactionInfoIndexer) at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`);
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await fetchBlockInfoBatchRetryOnFailure(blockNumberBatch, network, rawLatestBlockNumberWithinRangeLimit, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching block info (transactionInfoIndexer) at ${Math.floor(new Date().getTime() / 1000)}`, JSON.stringify(e));
      }
      return [];
    }
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
    for await(let batch of batches) {

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
      await sleep(1000);
      const blockInfoBatch = await fetchBlockInfoBatchRetryOnFailure(uniqueBlockNumbers, network, transactionInfoBatch.map((item: any) => item.result.blockNumber));
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
      createLog(`transactionInfoIndexer fetched batch ${currentBatch} of ${batches.length} (${new Date().getTime() - startTime}ms)`);

    }

    return transactions ? transactions : [];

  }
  
  return [];

}

//@ts-ignore
export const fetchTransactionReceiptBatchRetryOnFailure = async (txHashBatch: string[], network: string, retryCount: number = 0) => {
  let url = NETWORK_TO_ENDPOINT[network];
  if(url) {
    if (debugMode) {
      createLog({url})
    }
    let postBody = txHashBatch.map((txHash) => ({
      jsonrpc: "2.0",
      id: txHash,
      method: "eth_getTransactionReceipt",
      params: [ txHash ],
    }));
    try {
      // @ts-ignore
      let results = await axios.post(
        url,
        JSON.stringify(postBody),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if(debugMode) {
        createLog(results, results?.data)
      }
      // check for errors
      if(results?.data) {
        let hasError = results?.data.find((item: any) => item.error);
        if(hasError) {
          throw new Error(`response contained errors: ${hasError}`)
        }
      }
      return results?.data ? results?.data : [];
    } catch (e) {
      retryCount++;
      if(retryCount < 10) {
        createErrorLog(`error fetching transaction receipt data at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, JSON.stringify(postBody));
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await fetchTransactionReceiptBatchRetryOnFailure(txHashBatch, network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching transaction receipt data at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return [];
    }
  }
  return [];
}

export const transactionEventsIndexer = async (
  transactionHashes: string[],
  network: string,
  meta: string,
) => {
  let transactionHashesCount = transactionHashes.length;

  createLog({"transactionEventsIndexer transactionHashesCount:": transactionHashesCount})

  if(transactionHashesCount > 0) {
    let batches = sliceArrayIntoChunks(transactionHashes, maxBatchSize);

    let currentBatch = 0;
    let transactionEvents: any[] = [];
    
    for await(let batch of batches) {
      let startTime = new Date().getTime();

      currentBatch++;

      // log batch status
      createLog(`transactionEventsIndexer fetching batch ${currentBatch} of ${batches.length} for ${meta}`);

      // fetch transaction receipts (which contain events/logs)
      await sleep(1000);
      let transactionReceiptBatch = await fetchTransactionReceiptBatchRetryOnFailure(batch, network);
      
      // Process receipts to extract events
      const processedEvents = transactionReceiptBatch.map((receiptEntry: any) => {
        if (!receiptEntry.result) return null;
        
        return {
          transactionHash: receiptEntry.id,
          events: receiptEntry.result.logs || [],
          status: receiptEntry.result.status // 0x1 for success, 0x0 for failure
        };
      }).filter(Boolean);
      
      transactionEvents = [...transactionEvents, ...processedEvents];

      // log batch status
      createLog(`transactionEventsIndexer fetched batch ${currentBatch} of ${batches.length} (${new Date().getTime() - startTime}ms)`);
    }

    return transactionEvents;
  }
  
  return [];
}

// Helper function to parse events using ABI
const parseEventLogs = (logs: any[], abi: any[]) => {
  if (!logs || !abi || !Array.isArray(logs) || !Array.isArray(abi)) {
    return logs;
  }

  // Extract event definitions from ABI
  const eventAbis = abi.filter(item => item.type === 'event');
  
  // Create a map of event signatures to event ABIs
  const eventSignatures: { [key: string]: any } = {};
  eventAbis.forEach(eventAbi => {
    // Create event signature (e.g., "Transfer(address,address,uint256)")
    const signature = `${eventAbi.name}(${eventAbi.inputs.map((input: any) => input.type).join(',')})`;
    // Create event topic (keccak256 hash of the signature)
    const topic = utils.id(signature);
    eventSignatures[topic] = eventAbi;
  });

  // Parse each log
  return logs.map(log => {
    try {
      if (!log.topics || log.topics.length === 0) {
        return log;
      }

      const eventTopic = log.topics[0];
      const eventAbi = eventSignatures[eventTopic];

      if (!eventAbi) {
        return {
          ...log,
          parsedEvent: {
            name: 'Unknown',
            signature: eventTopic,
            parsed: false
          }
        };
      }

      // Prepare indexed and non-indexed parameters
      const indexedInputs = eventAbi.inputs.filter((input: any) => input.indexed);
      const nonIndexedInputs = eventAbi.inputs.filter((input: any) => !input.indexed);

      // Parse indexed parameters from topics (skip the first topic as it's the event signature)
      const indexedValues: any = {};
      indexedInputs.forEach((input: any, index: number) => {
        // Topics start at index 1 (index 0 is the event signature)
        const topicIndex = index + 1;
        if (topicIndex < log.topics.length) {
          try {
            // Decode the topic according to its type
            const value = utils.defaultAbiCoder.decode(
              [input.type],
              utils.hexDataSlice(utils.hexZeroPad(log.topics[topicIndex], 32), 0)
            )[0];
            indexedValues[input.name] = value;
          } catch (e) {
            indexedValues[input.name] = log.topics[topicIndex];
          }
        }
      });

      // Parse non-indexed parameters from data
      let nonIndexedValues: any = {};
      if (nonIndexedInputs.length > 0 && log.data && log.data !== '0x') {
        try {
          const types = nonIndexedInputs.map((input: any) => input.type);
          const values = utils.defaultAbiCoder.decode(types, log.data);
          nonIndexedInputs.forEach((input: any, index: number) => {
            nonIndexedValues[input.name] = values[index];
          });
        } catch (e) {
          nonIndexedValues = { error: 'Failed to decode data' };
        }
      }

      // Combine all parameters
      const params = { ...indexedValues, ...nonIndexedValues };

      return {
        ...log,
        parsedEvent: {
          name: eventAbi.name,
          signature: `${eventAbi.name}(${eventAbi.inputs.map((input: any) => input.type).join(',')})`,
          params,
          parsed: true
        }
      };
    } catch (e) {
      return {
        ...log,
        parsedEvent: {
          error: 'Failed to parse event',
          parsed: false
        }
      };
    }
  });
};

// Enhanced function that combines transaction info and events with optional ABI parsing
export const transactionInfoAndEventsIndexer = async (
  transactionHashes: string[],
  network: string,
  meta: string,
  abi?: any[] // Optional ABI parameter
) => {
  // Get transaction info
  const transactions = await transactionInfoIndexer(transactionHashes, network, meta);
  
  // Get transaction events
  const transactionEvents = await transactionEventsIndexer(transactionHashes, network, meta);
  
  // Create a map of transaction hash to events for quick lookup
  const eventsMap: { [key: string]: any } = {};
  transactionEvents.forEach(eventData => {
    if (eventData && eventData.transactionHash) {
      // Parse events if ABI is provided
      const events = abi 
        ? parseEventLogs(eventData.events, abi)
        : eventData.events;
        
      eventsMap[eventData.transactionHash] = events;
    }
  });
  
  // Merge transaction info with events
  const enhancedTransactions = transactions.map(transaction => {
    if (!transaction || !transaction.hash) return transaction;
    
    return {
      ...transaction,
      events: eventsMap[transaction.hash] || []
    };
  });
  
  return enhancedTransactions;
}