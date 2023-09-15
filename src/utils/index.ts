import path from 'path';
import { request } from 'graphql-request';

import {
  formatPercentage
} from './numberFormatting';

import {
	createLog
} from '../logger';

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
      await sleep(2000 + Math.floor(Math.random() * 5000));
      await subgraphRequestWithRetry(query, url, retryMax, retryCount);
    } else {
      //@ts-ignore
      throw new Error(e);
    }
  }
}

const getEventFingerprint = (network: string, blockNumber: string, txIndex: string, logIndex: string) => {
  return `${network}-${blockNumber}-${txIndex}-${logIndex}`;
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
}
