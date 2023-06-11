import BigNumber from 'bignumber.js';

import {
  ContractCallContext,
} from 'ethereum-multicall';

import {
  IBalanceRecord
} from '../../interfaces';

import ERC721ABI from '../abis/ERC721ABI.json';

import {
  multicallProviderRetryOnFailureLib2,
} from '../utils';

import {
  sliceArrayIntoChunks
} from '../../utils';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

interface ITokenURIERC721Result {
  [key: string]: { 
    [key: string]: string 
  }
};

export const getTokenURIOfERC721 = async (
  balanceRecords: IBalanceRecord[],
  network: string,
) => {

  let batches = sliceArrayIntoChunks(balanceRecords, 20);

  let allTokenURIERC721 : ITokenURIERC721Result = {};

  for(let batch of batches) {

    const contractCallContext: ContractCallContext[] = [];

    for(let balanceRecord of batch) {
      if(!allTokenURIERC721[balanceRecord.asset_address]) {
        allTokenURIERC721[balanceRecord.asset_address] = {};
        allTokenURIERC721[balanceRecord.asset_address][balanceRecord.token_id] = '';
      } else {
        allTokenURIERC721[balanceRecord.asset_address][balanceRecord.token_id] = '';
      }
      contractCallContext.push({
        reference: balanceRecord.token_id,
        contractAddress: balanceRecord.asset_address,
        abi: ERC721ABI,
        calls: [{ reference: 'tokenURI', methodName: 'tokenURI', methodParameters: [Number(balanceRecord.token_id)] }]
      })
    }

    let batchOfTokenURI = await multicallProviderRetryOnFailureLib2(contractCallContext, network, 'tokenURI ERC-721');
    
    for(let [tokenId, tokenURIResult] of Object.entries(batchOfTokenURI?.results)) {
      let tokenAddress = tokenURIResult?.originalContractCallContext?.contractAddress;
      if(tokenURIResult?.callsReturnContext[0].success === true) {
        let result = tokenURIResult?.callsReturnContext[0].returnValues[0];
        allTokenURIERC721[tokenAddress][tokenId] = result;
      }
    }

  }

  return allTokenURIERC721;

}