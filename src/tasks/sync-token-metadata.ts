import BigNumber from 'bignumber.js';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

import {
  INetworkToBalanceEntry,
  IBalanceRecord,
} from '../interfaces';

import {
  BalanceRepository,
} from '../database/repositories';

import {
  getTokenURIOfERC721,
} from '../web3/jobs'

import {
  fetchIpfsData
} from './get-ipfs-result';

export const syncTokenMetadata = async (tokenBalanceRecord: [], tokenStandard: string) => {

  try {

    // let latestBlockNumber = await getLatestBlockNumber(network);

    let networkToTokens = tokenBalanceRecord.reduce((acc: INetworkToBalanceEntry, current: IBalanceRecord) => {
      if(acc[current.network_name]){
        acc[current.network_name].push(current);
      } else {
        acc[current.network_name] = [];
        acc[current.network_name].push(current);
      }
      return acc;
    }, {})
   
    for(let [network, balanceRecords] of Object.entries(networkToTokens)) {
      let networkResults = await getTokenURIOfERC721(balanceRecords, network);
      for(let [tokenAddress, tokenIdsToIpfsLinks] of Object.entries(networkResults)) {
        for(let [tokenId, ipfsLink] of Object.entries(tokenIdsToIpfsLinks)) {
          let ipfsResult = await fetchIpfsData(ipfsLink);
          // update token balance record metadata
          let metadata = JSON.stringify(ipfsResult);
          await BalanceRepository.updateBalanceMetadataByNetworkStandardTokenAddressAndTokenId(metadata, network, tokenAddress, tokenId);
          console.log(`Updated token metadata`, { network, tokenAddress, tokenId })
        }
      }
    }

  } catch (e) {
    throw new Error(`Error encountered while syncing token metadata: ${e}`);
    return null;
  }

}