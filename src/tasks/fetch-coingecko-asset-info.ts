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

const coingeckoRetryMax = 3;

export const fetchCoingeckoAssetInfo = async (network: string, assetAddress: string, retryCount: number = 0) => {
  let url = `https://pro-api.coingecko.com/api/v3/coins/${network}/contract/${assetAddress}?x_cg_pro_api_key=${COINGECKO_API_KEY}`;
  if (debugMode) {
    createLog({url})
  }
  let results : ICoingeckoAssetInfo = await axios.get(
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
    if(retryCount < coingeckoRetryMax) {
      createErrorLog(`error fetching coingecko token info at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(5000);
      return await fetchCoingeckoAssetInfo(network, assetAddress, retryCount);
    } else {
      createErrorLog(`retries failed, error fetching coingecko token info at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return false;
  })
  return results;
}