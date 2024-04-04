import path from 'path';
import { request } from 'graphql-request';

import {
  formatPercentage
} from './numberFormatting';

import {
	createLog
} from '../logger';

import {
  verifySignature,
} from './web3';

const envPath = (directory: string) => path.resolve(__dirname, '../../' + directory);
const srcPath = (directory: string) => path.resolve("src", directory || "");

require('dotenv').config({ path: envPath(".env") });

const env = (key: string, defaultValue?: any) => {
  const value = process.env[key] || defaultValue
  if (typeof value === "undefined") {
      throw new Error(`Environment variable ${key} not set.`)
  }

  return value;
}

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const sliceArrayIntoChunks = (arr: any[], chunkSize: number) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      res.push(chunk);
  }
  return res;
}

const subgraphRequestWithRetry = async (query: string, url = "", retryMax = 3, retryCount = 0) => {
  try {
    let result = await request(url, query);
    return result;
  } catch (e) {
    retryCount++;
    if(retryCount < retryMax) {
      createLog(`Query failed, retry #${retryCount}`);
      await sleep(2000 + Math.floor(Math.random() * 5000) * retryCount);
      await subgraphRequestWithRetry(query, url, retryMax, retryCount);
    } else {
      //@ts-ignore
      throw new Error(e);
    }
  }
}

const capitalizeFirstLetter = (str: string): string => {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

const getEventFingerprint = (network: string, blockNumber: string, txIndex: string, logIndex: string) => {
  return `${network}-${blockNumber}-${txIndex}-${logIndex}`;
}

const verifySignedMessage = async (
  plaintextMessage: string,
  signedMessage: string,
  signerAddress: string,
) => {
  let result = await verifySignature(plaintextMessage, signedMessage, signerAddress);
  return result;
}

const actionHasRequiredMetadataParts = (
  action: string,
  metadata: any,
) => {
  if(action === 'make_offchain_offer') {
    let requiredFields = ['token_address', 'token_id', 'token_network', 'offer_token_address', 'offer_token_amount'];
    for(let requiredField of requiredFields) {
      if(
        !metadata.hasOwnProperty(requiredField)
      ){
        return {
          success: false,
          message: `metadata missing ${requiredField} field`,
        }
      }
    }
    return {
      success: true,
    }
  }
  if(action === 'add_like_nft' || action === 'remove_like_nft') {
    let requiredFields = ['token_address', 'token_id', 'token_network'];
    for(let requiredField of requiredFields) {
      if(
        !metadata.hasOwnProperty(requiredField)
      ){
        return {
          success: false,
          message: `metadata missing ${requiredField} field`,
        }
      }
    }
    return {
      success: true,
    }
  }
  return {
    success: false,
    message: "unrecognized action",
  }
}

const getLatestBlockNumberWithinMaxBlockRange = (startBlock: number, latestBlockNumber: number, maxRange: number) => {
 if((latestBlockNumber - startBlock) > maxRange) {
  return startBlock + maxRange;
 }
 return latestBlockNumber;
}

const extractCoordinatesFromPointPostGIS = (pointString: string) => {
  const match = pointString.match(/POINT\((-?\d+\.?\d*) (-?\d+\.?\d*)\)/);
  if (match) {
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);
    return { longitude, latitude };
  }
  return null;
}

export {
  sleep,
  srcPath,
  envPath,
  env,
  formatPercentage,
  subgraphRequestWithRetry,
  sliceArrayIntoChunks,
  getEventFingerprint,
  verifySignedMessage,
  actionHasRequiredMetadataParts,
  capitalizeFirstLetter,
  getLatestBlockNumberWithinMaxBlockRange,
  extractCoordinatesFromPointPostGIS,
}
