import BigNumber from 'bignumber.js';

import {
  ContractCallContext,
} from 'ethereum-multicall';

import {
  INFTRecord,
} from '../../interfaces';

import ERC721ABI from '../abis/ERC721ABI.json';

import {
  multicallProviderRetryOnFailureLib2,
} from '../utils';

import {
  sliceArrayIntoChunks
} from '../../utils';

import {
	createLog
} from '../../logger';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

interface ITokenURIERC721Result {
  [key: string]: { 
    [key: string]: string 
  }
};

export const getTokenURIOfERC721 = async (
  nftRecords: INFTRecord[],
  network: string,
) => {

  let batches = sliceArrayIntoChunks(nftRecords, 20);

  let allTokenURIERC721 : ITokenURIERC721Result = {};

  let batchesFetched = 1;

  for(let batch of batches) {

    createLog(`Fetching ERC-721 tokenURI batch ${batchesFetched} of ${batches.length}`);

    const contractCallContext: ContractCallContext[] = [];

    for(let nftRecord of batch) {
      if(!allTokenURIERC721[nftRecord.asset_address]) {
        allTokenURIERC721[nftRecord.asset_address] = {};
        allTokenURIERC721[nftRecord.asset_address][nftRecord.token_id] = '';
      } else {
        allTokenURIERC721[nftRecord.asset_address][nftRecord.token_id] = '';
      }
      contractCallContext.push({
        reference: nftRecord.token_id,
        contractAddress: nftRecord.asset_address,
        abi: ERC721ABI,
        calls: [{ reference: 'tokenURI', methodName: 'tokenURI', methodParameters: [Number(nftRecord.token_id)] }]
      })
    }

    createLog("Before fetching batch");

    let batchOfTokenURI = await multicallProviderRetryOnFailureLib2(contractCallContext, network, 'tokenURI ERC-721');

    createLog("After fetching batch");
    
    for(let [tokenId, tokenURIResult] of Object.entries(batchOfTokenURI?.results)) {
      let tokenAddress = tokenURIResult?.originalContractCallContext?.contractAddress;
      if(tokenURIResult?.callsReturnContext[0].success === true) {
        let result = tokenURIResult?.callsReturnContext[0].returnValues[0];
        allTokenURIERC721[tokenAddress][tokenId] = result;
      }
    }

    batchesFetched++;

  }

  return allTokenURIERC721;

}