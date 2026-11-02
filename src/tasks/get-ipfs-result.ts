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

const IPFS_GATEWAY_ORIGIN = 'https://propy.mypinata.cloud';
const IPFS_GATEWAY_TIMEOUT_MS = 10 * 1000;
const IPFS_GATEWAY_MAX_RESPONSE_BYTES = 1024 * 1024;
const IPFS_GATEWAY_MAX_ATTEMPTS = 2;

// ipfs://<CID>[/<path>]. Path segments can't start with "." so the URL can't climb out of /ipfs/<CID>.
const IPFS_URI_PATTERN = /^ipfs:\/\/([A-Za-z0-9]{46,128})((?:\/[A-Za-z0-9_-][A-Za-z0-9_.-]*)*)\/?$/;

export const fetchIpfsData = async (url: string, retryCount: number = 0) => {
  if(url) {
    // temp patch while tokenURI not set properly on goerli TODO remove
    if((url.indexOf("ipfs://") === -1) && (url.indexOf("://") === -1)) {
      // temp patch while tokenURI not set properly on goerli TODO remove
      url = "ipfs://" + url;
    }
    url = url.replace('ipfs://', `${IPFS_GATEWAY_ORIGIN}/ipfs/`);
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
      let skipRetries = false;
      if(e?.response?.data && (e?.response?.data.indexOf("ERR_ID:00006") > -1)) {
        skipRetries = true;
        console.log("skipping retries due to encountering unpinned file");
      }
      if((retryCount < ipfsRetryMax) && !skipRetries) {
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

// Maps a strict ipfs:// URI to a URL on our gateway. Anything else (other schemes or hosts, odd paths) gives null.
export const ipfsUriToGatewayUrl = (tokenURI: string): string | null => {
  const match = IPFS_URI_PATTERN.exec(tokenURI);
  if(!match) {
    return null;
  }
  const [, cid, path] = match;
  const gatewayUrl = new URL(`/ipfs/${cid}${path}`, IPFS_GATEWAY_ORIGIN);
  if((gatewayUrl.origin !== IPFS_GATEWAY_ORIGIN) || !gatewayUrl.pathname.startsWith(`/ipfs/${cid}`)) {
    return null;
  }
  return gatewayUrl.toString();
}

// For request handlers. Unlike fetchIpfsData (used by the sync jobs), this only fetches strict ipfs:// URIs
// from our gateway, never follows redirects, caps response time and size, and retries at most once.
export const fetchIpfsDataFromGateway = async (tokenURI: string) => {
  const gatewayUrl = ipfsUriToGatewayUrl(tokenURI);
  if(!gatewayUrl) {
    createErrorLog(`Refusing to fetch tokenURI that is not a plain ipfs:// URI: ${JSON.stringify(String(tokenURI).slice(0, 200))}`);
    return false;
  }
  for(let attempt = 1; attempt <= IPFS_GATEWAY_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(gatewayUrl, {
        headers: { "Accept-Encoding": "gzip,deflate,compress" },
        timeout: IPFS_GATEWAY_TIMEOUT_MS,
        maxContentLength: IPFS_GATEWAY_MAX_RESPONSE_BYTES,
        maxRedirects: 0,
      });
      return response?.data ? response.data : false;
    } catch (e: any) {
      const status = e?.response?.status;
      // Retry gateway hiccups (5xx, 429, network errors), not 4xx, redirects or oversized responses
      const isRetryable = status ? ((status >= 500) || (status === 429)) : (e?.code !== 'ERR_BAD_RESPONSE');
      createErrorLog(`IPFS gateway fetch failed (attempt ${attempt} of ${IPFS_GATEWAY_MAX_ATTEMPTS}, status: ${status ?? 'n/a'}, code: ${e?.code ?? 'n/a'})`);
      if(!isRetryable || (attempt === IPFS_GATEWAY_MAX_ATTEMPTS)) {
        return false;
      }
      await sleep(500);
    }
  }
  return false;
}