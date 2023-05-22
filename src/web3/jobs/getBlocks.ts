import {
  sleep,
} from '../../utils';

import {
  getBlockWithRetries,
} from '../utils';

export const getBlocks = async (blockNumbers: number[]) => {

  console.log('getting blocks')
  
  let maxBatchSize = 100;

  let batches = Math.floor(blockNumbers.length / maxBatchSize) + 1;

  let allBlocks : any[] = [];

  let currentBatch = 1;
  for(let batch of Array.from({length: batches})) {

    let startIndex = (currentBatch - 1) * maxBatchSize;
    let endIndex = currentBatch * maxBatchSize;

    console.log(`Fetching block batch from index ${startIndex} to ${endIndex}`);

    let calls = blockNumbers.slice(startIndex, endIndex).map(blockNumber => getBlockWithRetries(blockNumber));

    let [...blocks] = await Promise.all(calls);

    allBlocks = [...allBlocks, ...blocks];

    currentBatch++;

    let randomDelay = 1000 + Math.floor(Math.random() * 1000);
    await sleep(randomDelay);

  }

  console.log('got blocks')

  return allBlocks;
  
}