import {
  sleep,
} from '../../utils';

import {
  getBlockWithRetries,
} from '../utils';

import {
	createLog
} from '../../logger';

export const getBlocks = async (blockNumbers: number[]) => {

  createLog('getting blocks')
  
  let maxBatchSize = 100;

  let batches = Math.floor(blockNumbers.length / maxBatchSize) + 1;

  let allBlocks : any[] = [];

  let currentBatch = 1;
  for(let batch of Array.from({length: batches})) {

    let startIndex = (currentBatch - 1) * maxBatchSize;
    let endIndex = currentBatch * maxBatchSize;

    createLog(`Fetching block batch from index ${startIndex} to ${endIndex}`);

    let calls = blockNumbers.slice(startIndex, endIndex).map(blockNumber => getBlockWithRetries(blockNumber));

    let [...blocks] = await Promise.all(calls);

    allBlocks = [...allBlocks, ...blocks];

    currentBatch++;

    let randomDelay = 1000 + Math.floor(Math.random() * 1000);
    await sleep(randomDelay);

  }

  createLog('got blocks')

  return allBlocks;
  
}