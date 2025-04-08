import BigNumber from 'bignumber.js';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

import {
  INetworkToNFTEntry,
  INFTRecord,
} from '../interfaces';

import {
  NFTRepository,
} from '../database/repositories';

import {
  getTokenURIOfERC721,
} from '../web3/jobs'

import {
  fetchIpfsData
} from './get-ipfs-result';

import {
	createLog
} from '../logger';

export const syncTokenMetadata = async (nftRecords: INFTRecord[], tokenStandard: string) => {

  try {

    // let latestBlockNumber = await getLatestBlockNumber(network);

    let networkToTokens = nftRecords.reduce((acc: INetworkToNFTEntry, current: INFTRecord) => {
      if(acc[current.network_name]){
        acc[current.network_name].push(current);
      } else {
        acc[current.network_name] = [];
        acc[current.network_name].push(current);
      }
      return acc;
    }, {})
   
    for(let [network, balanceRecords] of Object.entries(networkToTokens)) {
      let networkResults = await getTokenURIOfERC721(nftRecords, network);
      for(let [tokenAddress, tokenIdsToTokenURI] of Object.entries(networkResults)) {
        for(let [tokenId, ipfsLinkOrBase64] of Object.entries(tokenIdsToTokenURI)) {
          if(ipfsLinkOrBase64.indexOf('data:application/json;base64') > -1) {
            await NFTRepository.updateMetadataByNetworkStandardTokenAddressAndTokenId(ipfsLinkOrBase64, ipfsLinkOrBase64, network, tokenAddress, tokenId);
            createLog(`Updated token metadata`, { network, tokenAddress, tokenId });
          } else {
            let ipfsResult = await fetchIpfsData(ipfsLinkOrBase64);
            // update token balance record metadata
            let metadata = JSON.stringify(ipfsResult);
            if(metadata) {
              await NFTRepository.updateMetadataByNetworkStandardTokenAddressAndTokenId(metadata, ipfsLinkOrBase64, network, tokenAddress, tokenId);
              if(ipfsResult?.longitude && ipfsResult?.latitude) {
                await NFTRepository.updateLongitudeAndLatitude(ipfsResult?.longitude, ipfsResult?.latitude, network, tokenAddress, tokenId)
              } else {
                await NFTRepository.clearLongitudeAndLatitude(network, tokenAddress, tokenId)
              }
              createLog(`Updated token metadata`, { network, tokenAddress, tokenId });
            }
          }
        }
      }
    }

  } catch (e) {
    throw new Error(`Error encountered while syncing token metadata: ${e}`);
    return null;
  }

}