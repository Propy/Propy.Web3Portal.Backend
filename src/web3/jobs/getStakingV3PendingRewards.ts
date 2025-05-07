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

import PRONFTStakingV3ABI from '../abis/PRONFTStakingV3ABI.json';

import {
  queryFilterRetryOnFailure,
  multicallProviderRetryOnFailureLib2,
} from '../utils';

import {
  sliceArrayIntoChunks
} from '../../utils';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const getStakingV3PendingRewards = async (
  stakingRegistryAddress: string,
  moduleIds: string[],
  stakerAddresses: string[],
  network: string,
) => {

  let batches = sliceArrayIntoChunks(stakerAddresses, 20);

  let allPendingRewards : {[key: string]: {[key: string]: string}} = {};

  for(let batch of batches) {

    const contractCallContext: ContractCallContext[] = [];

    for(let stakerAddress of batch) {
      for(let [index, moduleId] of Object.entries(moduleIds)) {
        contractCallContext.push({
          reference: `getApproxStakerRewardsPending:${stakerAddress}:${stakingRegistryAddress}:${moduleId}`,
          contractAddress: stakingRegistryAddress,
          abi: PRONFTStakingV3ABI,
          calls: [{ reference: `getApproxStakerRewardsPending:${stakerAddress}`, methodName: 'getApproxStakerRewardsPending', methodParameters: [stakerAddress, moduleId] }]
        })
      }
    }

    let batchOfPendingRewards = await multicallProviderRetryOnFailureLib2(contractCallContext, network, 'address ERC-20 balance');
    
    let PendingRewards : string[] = [];
    for(let [reference, pendingRewardResult] of Object.entries(batchOfPendingRewards?.results)) {
      let [
        methodName,
        stakerAddress,
        registryContractAddress,
        moduleId
      ] = reference.split(":");
      if(pendingRewardResult?.callsReturnContext[0].success === true) {
        let result = pendingRewardResult?.callsReturnContext[0].returnValues[0]
        let hexToNumber = new BigNumber(result.hex).toString();
        if(!allPendingRewards[stakerAddress]) {
          allPendingRewards[stakerAddress] = {};
        }
        allPendingRewards[stakerAddress][moduleId] = hexToNumber;
      } else {
        if(!allPendingRewards[stakerAddress]) {
          allPendingRewards[stakerAddress] = {};
        }
        allPendingRewards[stakerAddress][moduleId] = "0";
      }
    }

  }

  return allPendingRewards;

}