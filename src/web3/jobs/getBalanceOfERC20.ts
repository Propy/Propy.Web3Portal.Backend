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

export const getBalanceOfERC20 = async (
  assetAddresses: string[],
  holderAddress: string,
  network: string,
) => {

  let batches = sliceArrayIntoChunks(assetAddresses, 20);

  let allBalancesERC20 : any[] = [];

  for(let batch of batches) {

    const contractCallContext: ContractCallContext[] = [];

    for(let tokenAddress of batch) {
      contractCallContext.push({
        reference: tokenAddress,
        contractAddress: tokenAddress,
        abi: ERC20ABI,
        calls: [{ reference: 'balanceOf', methodName: 'balanceOf', methodParameters: [holderAddress] }]
      })
    }

    let batchOfBalances = await multicallProviderRetryOnFailureLib2(contractCallContext, network, 'address ERC-20 balance');
    
    let balances : string[] = [];
    for(let [tokenAddress, balanceResult] of Object.entries(batchOfBalances?.results)) {
      if(balanceResult?.callsReturnContext[0].success === true) {
        let result = balanceResult?.callsReturnContext[0].returnValues[0]
        let hexToNumber = new BigNumber(result.hex).toString();
        allBalancesERC20.push(hexToNumber);
      } else {
        allBalancesERC20.push(0);
      }
    }

  }

  let index = 0;
  let results : {[key: string]: string} = {};
  for(let balance of allBalancesERC20) {
    let tokenAddress = assetAddresses[index];
    results[tokenAddress] = balance ? balance.toString() : "0";
    index++;
  }

  return results;

}