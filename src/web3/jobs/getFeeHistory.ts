import axios from 'axios';

import {
  debugMode,
  NETWORK_TO_ENDPOINT,
} from '../../constants';

import {
  sleep,
} from '../../utils';

import {
	createLog,
  createErrorLog,
} from '../../logger';

//@ts-ignore
export const getFeeHistory = async (network: string, retryCount: number = 0) => {
  createLog(`Fetching latest fee history on ${network}`);
  let url = NETWORK_TO_ENDPOINT[network];
  if(url) {
    if (debugMode) {
      createLog({url})
    }
    let postBody = {
      jsonrpc: "2.0",
      id: "feeHistory",
      method: "eth_feeHistory",
      params: [ "0x1", "latest", [50] ],
    }
    if (debugMode) {
      createLog({postBody: JSON.stringify(postBody)})
    }
    try {
      // @ts-ignore
      let result = await axios.post(
        url,
        JSON.stringify(postBody),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
      // handle success
      if(debugMode) {
        createLog(result, result?.data)
      }
      // check for errors
      if(result?.data) {
        let hasError = result?.data.hasOwnProperty("error");
        if(hasError) {
          createErrorLog({hasError});
          throw new Error(hasError)
        }
      }
      return result?.data?.reward?.[0]?.[0] ? Number(result?.data.reward[0][0]) : 0;
    } catch (e) {
      retryCount++;
      if(retryCount < 3) {
        createErrorLog(`error fetching latest fee history at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await getFeeHistory(network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching latest fee history at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return 0;
    }
  }
  return 0;
}