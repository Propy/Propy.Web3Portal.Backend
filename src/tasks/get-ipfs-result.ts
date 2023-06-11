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

const ipfsRetryMax = 3;

export const fetchIpfsData = async (url: string, retryCount: number = 0) => {
  url = url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (debugMode) {
    console.log({url})
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
      console.log(response, response?.data)
    }
    return response?.data ? response?.data : false;
  })
  .catch(async (e) => {
    retryCount++;
    if(e?.response?.data?.error === "coin not found") {
      return false;
    }
    if(retryCount < ipfsRetryMax) {
      console.error(`error fetching ipfs data at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(5000);
      return await fetchIpfsData(url, retryCount);
    } else {
      console.error(`retries failed, error fetching ipfs data at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return false;
  })
  return results;
}