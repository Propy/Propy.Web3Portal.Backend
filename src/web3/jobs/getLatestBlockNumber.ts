import {
  getNetworkProvider,
} from '../utils';

import {
  sleep,
} from '../../utils';

import {
	createLog,
  createErrorLog,
} from '../../logger';

export const getLatestBlockNumberRetryOnFailure : (network: string, retryCount?: number) => Promise<number> = async (network: string, retryCount = 0) => {

  createLog(`Getting latest block number on ${network}`);

  let provider = getNetworkProvider(network);

  if(provider) {

    try {
  
      let blockNumber = await provider.getBlockNumber();

      return blockNumber;

    } catch (e) {
      retryCount++;
      if(retryCount < 5) {
        createErrorLog(`error fetching latest block number on ${network} at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000));
        return await getLatestBlockNumberRetryOnFailure(network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching latest block number on ${network} at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return 0;
    }

  }

  return 0;
  
}