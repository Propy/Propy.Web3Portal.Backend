import { Event, utils, Contract } from 'ethers';

import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from 'ethereum-multicall';

import BigNumber from 'bignumber.js';

import {
	NetworkRepository,
} from "../../database/repositories";

import {
  INetwork
} from "../../interfaces";

import {
  sleep,
} from '../../utils';

import {
	createLog,
  createErrorLog,
} from '../../logger';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

import {
  EthersProviderEthereum,
  MulticallProviderEthereumLib2,
  // EthersProviderOptimism,
  // MulticallProviderOptimismLib2,
  EthersProviderArbitrum,
  MulticallProviderArbitrumLib2,
  EthersProviderGoerli,
  MulticallProviderGoerliLib2,
  EthersProviderSepolia,
  MulticallProviderSepoliaLib2,
} from "../../app";

export interface IEventIndexerBlockTracker {
  event_name: string
  from_block: number
  genesis_block: number
  meta: string
}

export const extractFromBlockToBlock = (
  latestBlockNumber: number,
  eventIndexBlockTracker: IEventIndexerBlockTracker,
) => {
  
    const {
      from_block,
      genesis_block,
    } = eventIndexBlockTracker;
  
    let toBlock = latestBlockNumber;
  
    // derive fromBlock
    let fromBlock = 0;
    if(from_block) {
      fromBlock = from_block
    } else if (genesis_block) { // keep else, condition is (genesis_block && !from_block)
      fromBlock = genesis_block
    }

    let blockRange = (toBlock - fromBlock) + 1; // toBlock and fromBlock are both inclusive so we + 1

    return {
      fromBlock,
      toBlock,
      blockRange
    }
    
}

export const queryFilterRetryOnFailure = async (
  contract: any,
  abi: any,
  eventFilter: any,
  network: string,
  fromBlock?: number,
  toBlock?: number,
  retryCount?: number,
  retryMax?: number,
): Promise<Array<Event | utils.LogDescription> | null> => {
  if(!retryMax) {
    retryMax = 10;
  }
  if(!retryCount) {
    retryCount = 0;
  }
  try {
    if(contract) {
      const eventContractEventBatch = await contract.queryFilter(eventFilter, fromBlock, toBlock);
      return eventContractEventBatch;
    } else {
      let provider = getNetworkProvider(network);
      if(provider) {
        eventFilter.fromBlock = fromBlock;
        eventFilter.toBlock = toBlock;
        const eventContractEventBatch = await provider.getLogs(eventFilter);
        let parsedEventBatch = [];
        for(let event of eventContractEventBatch) {
          const RawContract = new Contract(event.address, abi);
          const connectedContract = await RawContract.connect(provider);
          try {
            const parsedEvent = connectedContract.interface.parseLog(event);
            parsedEventBatch.push(Object.assign(parsedEvent, event));
          } catch (e) {
            createLog(`Failed to parse event on ${network} due to event not matching ABI (txhash: ${event.transactionHash})`);
          }
        }
        return parsedEventBatch;
      }
      return [];
    }
  } catch (e) {
    retryCount++;
    if(retryCount <= retryMax) {
      createErrorLog(`Query failed, starting retry #${retryCount} (eventFilter: ${eventFilter}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, error: ${e})`);
      let randomDelay = 1000 + Math.floor(Math.random() * 2000);
      await sleep(randomDelay);
      return await queryFilterRetryOnFailure(contract, abi, eventFilter, network, fromBlock, toBlock, retryCount, retryMax);
    } else {
      createErrorLog(`Unable to complete queryFilter after max retries (eventFilter: ${eventFilter}, fromBlock: ${fromBlock}, toBlock: ${toBlock})`);
      return null;
    }
  }
}

export const multicallProviderRetryOnFailureLib2 = async (
  calls: any[],
  network: string,
  meta: string,
  retryCount?: number,
  retryMax?: number,
): Promise<ContractCallResults> => {
  if(!retryMax) {
    retryMax = 10;
  }
  if(!retryCount) {
    retryCount = 0;
  }
  try {
    if(network === 'ethereum') {
      const results: ContractCallResults = await MulticallProviderEthereumLib2.call(calls);
      return results;
    } else if (network === 'arbitrum') {
      const results: ContractCallResults = await MulticallProviderArbitrumLib2.call(calls);
      return results;
    } else if (network === 'goerli') {
      const results: ContractCallResults = await MulticallProviderGoerliLib2.call(calls);
      return results;
    } else if (network === 'sepolia') {
      const results: ContractCallResults = await MulticallProviderSepoliaLib2.call(calls);
      return results;
    }
    // else if (network === 'optimism') {
    //   const results: ContractCallResults = await MulticallProviderOptimismLib2.call(calls);
    //   return results;
    // } 
    return {results: {}, blockNumber: 0};
  } catch (e) {
    retryCount++;
    if(retryCount <= retryMax) {
      createErrorLog(`Multicall failed, starting retry #${retryCount} (meta: ${meta})`);
      let randomDelay = 1000 + Math.floor(Math.random() * 2000);
      await sleep(randomDelay);
      return await multicallProviderRetryOnFailureLib2(calls, network, meta, retryCount, retryMax);
    } else {
      createErrorLog(`Unable to complete multicallProviderRetryOnFailure after max retries (meta: ${meta})`);
      return {results: {}, blockNumber: 0};
    }
  }
}

export const getNetworkProvider = (network: string) => {
  if(network === 'ethereum') {
    return EthersProviderEthereum
  } else if (network === 'optimism') {
    // return EthersProviderOptimism
  } else if (network === 'arbitrum') {
    return EthersProviderArbitrum
  } else if (network === 'goerli') {
    return EthersProviderGoerli
  } else if (network === 'sepolia') {
    return EthersProviderSepolia
  }
}

export const getBlockWithRetries = async (blockNumber: number, retryCount?: number, retryMax?: number): Promise<any> => {
  if(!retryMax) {
    retryMax = 10;
  }
  if(!retryCount) {
    retryCount = 0;
  }
  try {
    let block = await EthersProviderEthereum.getBlock(blockNumber).catch(e => {throw new Error(e)});
    return block;
  } catch (e) {
    retryCount++;
    if(retryCount <= retryMax) {
      createErrorLog(`Query failed, starting retry #${retryCount} (blockNumber: ${blockNumber})`);
      let randomDelay = 1000 + Math.floor(Math.random() * 2000);
      await sleep(randomDelay);
      return await getBlockWithRetries(blockNumber, retryCount, retryMax);
    } else {
      createErrorLog(`Unable to complete getBlock after max retries (blockNumber: ${blockNumber})`);
      return null;
    }
  }
}

export const isETHAddress = (value: string) => {
  try {
      return utils.isAddress(value);
  } catch (e) {
      return false;
  }
}

export const isSyncMeta = (value: string) => {
  return ["erc20-sync", "erc721-sync", "erc721-tokenuri-update-sync"].indexOf(value) > -1;
}

export const isValidNetworkName = (value: string) => {
  return ["ethereum", "arbitrum", "goerli"].indexOf(value) > -1;
}

export const isETHAddressArray = (value: string[]) => {
  let result = true;
  for(let entry of value) {
    try {
      if(result) {
        result = utils.isAddress(entry);
      }
    } catch (e) {
      result = false
    }
  }
  return result;
}

export const isSupportedNetwork = (network: string) => {
  let networkNames = ["ethereum", "canto", "arbitrum", "optimism"];
  if(networkNames.indexOf(network) > -1) {
    return true;
  }
  return false;
}

export const isValidBalance = (balance: string) => {
  let isNaN = new BigNumber(balance).isNaN();
  if(isNaN) {
    return false;
  }
  return true;
}