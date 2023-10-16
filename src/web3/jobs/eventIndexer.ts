import {
  queryFilterRetryOnFailure
} from '../utils';

import {
	createLog
} from '../../logger';

export const eventIndexer = async (
  contract: any,
  abi: any,
  eventFilter: any,
  latestBlockNumber: number,
  fromBlock: number,
  toBlock: number,
  blockRange: number,
  maxBlockBatchSize: number,
  network: string,
  meta: string,
) => {

  if(blockRange > 0) {

    let batchSizeModResult = blockRange % maxBlockBatchSize;
    let isSmallerThanMaxBlockBatchSize = blockRange <= maxBlockBatchSize;

    let batchCount = Math.ceil(blockRange / maxBlockBatchSize);
    if(isSmallerThanMaxBlockBatchSize) {
      batchCount = 1;
    } else if (batchSizeModResult === 0) {
      batchCount = Math.floor(blockRange / maxBlockBatchSize);
    }

    let currentBatch = 0;
    let events : any[] = [];
    for(let iteration of Array.from({length: batchCount})) {

      let startTime = new Date().getTime();

      currentBatch++;

      // log batch status
      createLog(`eventIndexer fetching batch ${currentBatch} of ${batchCount} for ${meta}`);

      // get fromBlock and toBlock
      if(currentBatch === batchCount) {
        // last batch
        if(batchCount === 1) {
          // last batch is also first batch
          toBlock = latestBlockNumber;
        } else {
          // last batch is not first batch
          fromBlock = fromBlock + maxBlockBatchSize;
          toBlock = latestBlockNumber;
        }
      } else if (currentBatch === 1) {
        // first batch, but not the last batch (e.g. in case one one batch)
        toBlock = fromBlock + maxBlockBatchSize;
      } else {
        // middle batch, not the first and not the last
        fromBlock = fromBlock + maxBlockBatchSize;
        toBlock = fromBlock + maxBlockBatchSize;
      }

      // fetch batch
      const eventContractEventBatch = await queryFilterRetryOnFailure(contract, abi, eventFilter, network, fromBlock, toBlock);
      events = [...events, ...(eventContractEventBatch ? eventContractEventBatch : [])];

      // log batch status
      createLog(`eventIndexer fetched batch ${currentBatch} of ${batchCount} (${new Date().getTime() - startTime}ms, fromBlock: ${fromBlock}, toBlock: ${toBlock})`);
    }

    return events ? events : [];

  }
  
}