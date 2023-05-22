import { Contract as MulticallContract } from 'ethers-multicall';

import { Contract, utils } from 'ethers';

import BigNumber from 'bignumber.js';

import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from 'ethereum-multicall';


import {
  EthersProviderEthereum,
} from "../../app";

import ERC20ABI from '../abis/ERC20ABI.json';

import {
  queryFilterRetryOnFailure,
  multicallProviderRetryOnFailureLib2,
} from '../utils';

import {
  sliceArrayIntoChunks
} from '../../utils';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

interface IAllSiloAssetBalanceResults {
  [key: string]: IAllSiloAssetBalances[]
}

interface IAllSiloAssetBalances {
  balance: string
  decimals: number
  tokenAddress: string
}

export const getTokenInfoERC20 = async (
  assetAddresses: string,
  network: string,
) => {

  const contractCallContext: ContractCallContext[] = [];

  contractCallContext.push({
    reference: `name`,
    contractAddress: assetAddresses,
    abi: ERC20ABI,
    calls: [{ reference: 'name', methodName: 'name', methodParameters: [] }]
  })

  contractCallContext.push({
    reference: `symbol`,
    contractAddress: assetAddresses,
    abi: ERC20ABI,
    calls: [{ reference: 'symbol', methodName: 'symbol', methodParameters: [] }]
  })

  contractCallContext.push({
    reference: `decimal`,
    contractAddress: assetAddresses,
    abi: ERC20ABI,
    calls: [{ reference: 'decimals', methodName: 'decimals', methodParameters: [] }]
  })

  let tokenInfoResults = await multicallProviderRetryOnFailureLib2(contractCallContext, network, 'ERC-20 token info');

  let tokenInfoTemplate = {
    address: assetAddresses,
    symbol: "",
    name: "",
    decimal: "",
    standard: "ERC-20",
    network: network,
  }
  
  for(let [tokenAddress, callResult] of Object.entries(tokenInfoResults?.results)) {
    let reference = callResult?.originalContractCallContext.reference;
    if(callResult?.callsReturnContext[0].success === true) {
      let result = callResult?.callsReturnContext[0].returnValues[0];
      //@ts-ignore
      tokenInfoTemplate[reference] = result;
    } else {
      throw new Error(`Unable to fetch ${reference} value`);
    }
  }
  
  return tokenInfoTemplate;

}