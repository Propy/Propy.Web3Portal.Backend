import BigNumber from 'bignumber.js';
import axios from 'axios';
import { utils } from "ethers";

import {
  ICoingeckoAssetPriceEntry,
  ITokenAddressToLastPrice,
} from '../interfaces';

import {
  debugMode,
  COINGECKO_API_KEY,
} from '../constants';

import {
  sleep
} from '../utils';

const coingeckoRetryMax = 3;

export const fetchBaseAssetCoingeckoPrices = async (assetAddressesQueryString : string, retryCount: number = 0) => {
  let url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${assetAddressesQueryString}&vs_currencies=usd&x_cg_pro_api_key=${COINGECKO_API_KEY}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
  if (debugMode) {
    console.log({url})
  }
  let results : {[key: string]: ICoingeckoAssetPriceEntry} = await axios.get(
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
    return response?.data ? response?.data : {};
  })
  .catch(async (e) => {
    retryCount++;
    if(retryCount < coingeckoRetryMax) {
      console.error(`error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(5000);
      return await fetchBaseAssetCoingeckoPrices(assetAddressesQueryString, retryCount);
    } else {
      console.error(`retries failed, error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return {};
  })
  return results;
}

export const fetchCoingeckoPrices = async (assetAddressesQueryString : string, network: string, retryCount = 0) => {
  let results : ICoingeckoAssetPriceEntry[] = await axios.get(
    `https://pro-api.coingecko.com/api/v3/simple/token_price/${network}?contract_addresses=${assetAddressesQueryString}&vs_currencies=USD&x_cg_pro_api_key=${COINGECKO_API_KEY}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
    {
      headers: { "Accept-Encoding": "gzip,deflate,compress" }
    }
  )
  .then(function (response) {
    // handle success
    return response?.data ? response?.data : {};
  })
  .catch(async (e) => {
    retryCount++;
    if(retryCount < coingeckoRetryMax) {
      console.error(`error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(10000);
      return await fetchCoingeckoPrices(assetAddressesQueryString, network, retryCount);
    } else {
      console.error(`retries failed, error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return {};
  })
  let assetAddressToCoingeckoUsdPriceInfo : ITokenAddressToLastPrice = {}
  let iterable = Object.entries(results);
  if(iterable.length > 0) {
    for(let assetAddressToPrice of iterable) {
      let checksumAssetAddress = utils.getAddress(assetAddressToPrice[0]);
      assetAddressToCoingeckoUsdPriceInfo[checksumAssetAddress] = {
        usd: assetAddressToPrice[1].usd ? new BigNumber(assetAddressToPrice[1].usd).toString() : new BigNumber(0).toString(),
        usd_market_cap: assetAddressToPrice[1].usd_market_cap ? new BigNumber(assetAddressToPrice[1].usd_market_cap).toString() : new BigNumber(0).toString(),
        usd_24h_vol: assetAddressToPrice[1].usd_24h_vol ? new BigNumber(assetAddressToPrice[1].usd_24h_vol).toString() : new BigNumber(0).toString(),
        usd_24h_change: assetAddressToPrice[1].usd_24h_change ? new BigNumber(assetAddressToPrice[1].usd_24h_change).toString() : new BigNumber(0).toString(),
      }
    }
  }
  return assetAddressToCoingeckoUsdPriceInfo;
}