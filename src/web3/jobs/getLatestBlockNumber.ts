import {
  getNetworkProvider,
} from '../utils';

export const getLatestBlockNumber = async (network: string) => {

  let provider = getNetworkProvider(network);

  if(provider) {
  
    let blockNumber = await provider.getBlockNumber();

    return blockNumber;

  }

  return 0;
  
}