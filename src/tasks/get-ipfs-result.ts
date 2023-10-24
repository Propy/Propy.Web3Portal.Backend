import BigNumber from 'bignumber.js';
import axios from 'axios';
import { utils } from "ethers";

import {
  ICoingeckoAssetPriceEntry,
  ITokenAddressToLastPrice,
  ICoingeckoAssetInfo,
} from '../interfaces';

import {
  debugMode,
  COINGECKO_API_KEY,
} from '../constants';

import {
  sleep
} from '../utils';

import {
	createLog,
  createErrorLog,
} from '../logger';

const ipfsRetryMax = 5;

export const fetchIpfsData = async (url: string, retryCount: number = 0) => {
  if(url) {
    // temp patch while tokenURI not set properly on goerli TODO remove
    if((url.indexOf("ipfs://") === -1) && (url.indexOf("://") === -1)) {
      // temp patch while tokenURI not set properly on goerli TODO remove
      url = "ipfs://" + url;
    }
    url = url.replace('ipfs://', 'https://propy.mypinata.cloud/ipfs/');
    createLog({url})
    if (debugMode) {
      createLog({url})
    }
    let results : any = await axios.get(
      url,
      {
        headers: { "Accept-Encoding": "gzip,deflate,compress" }
      }
    )
    .then(function (response) {
      // handle success
      if(debugMode) {
        createLog(response, response?.data)
      }
      return response?.data ? response?.data : false;
    })
    .catch(async (e) => {
      retryCount++;
      if(e?.response?.data?.error === "coin not found") {
        return false;
      }
      if(retryCount < ipfsRetryMax) {
        createErrorLog(`error fetching ipfs data at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await fetchIpfsData(url, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching ipfs data at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return false;
    })
    return results;
  }
  return false;
}