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
export const getMaxPriorityFeePerGas = async (network: string, retryCount: number = 0) => {
  createLog(`Fetching maxPriorityFeePerGas on ${network}`);
  let url = NETWORK_TO_ENDPOINT[network];
  if(url) {
    if (debugMode) {
      createLog({url})
    }
    let postBody = {
      jsonrpc: "2.0",
      id: "maxPriorityFeePerGas",
      method: "eth_maxPriorityFeePerGas",
      params: [],
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
      return result?.data?.result ? Number(result?.data?.result) : 0;
    } catch (e) {
      retryCount++;
      if(retryCount < 3) {
        createErrorLog(`error fetching maxPriorityFeePerGas at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
        await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
        return await getMaxPriorityFeePerGas(network, retryCount);
      } else {
        createErrorLog(`retries failed, error fetching maxPriorityFeePerGas at ${Math.floor(new Date().getTime() / 1000)}`, e);
      }
      return 0;
    }
  }
  return 0;
}