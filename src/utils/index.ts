import path from 'path';
import { request } from 'graphql-request';
import { MerkleTree } from 'merkletreejs';
import { utils } from 'ethers';

import {
  formatPercentage
} from './numberFormatting';

import {
	createLog
} from '../logger';

import {
  verifySignature,
} from './web3';

interface UniswapNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: any; // For any additional properties
}

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
  if(action === 'add_like_propykeys_listing' || action === 'remove_like_propykeys_listing') {
    let requiredFields = ['listing_id'];
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

export const merkleTreeGenerator = async (whitelist: any) => {
  const leaves = Object.entries(whitelist).map((x) =>  {
    return utils.solidityKeccak256(["address", "uint256"], [x[0], x[1]]);
  });
  const tree = new MerkleTree(leaves, utils.keccak256, { sortPairs: true });
  const root = tree.getRoot().toString('hex');
  return '0x' + root;
}

export const merkleTreeGenerateProof = async (whitelist: any, ethAddress: string, amount: string) => {
  const leaves = Object.entries(whitelist).map((x) =>  {
    return utils.solidityKeccak256(["address", "uint256"], [x[0], x[1]]);
  });
  const tree = new MerkleTree(leaves, utils.keccak256, { sortPairs: true });
  const leaf = utils.solidityKeccak256(["address", "uint256"], [ethAddress, amount]);
  const proof = tree.getHexProof(leaf);
  return proof;
}

const decodeUniswapNFTTokenURI = (tokenURI: string): UniswapNFTMetadata => {
  // Check if the URI is in the data URI format
  if (!tokenURI.startsWith('data:application/json;base64,')) {
    throw new Error('Invalid tokenURI format: Expected data:application/json;base64,');
  }

  try {
    // Extract the base64 part
    const base64Part = tokenURI.split('base64,')[1];
    
    // Decode the base64 string
    const decodedData = atob(base64Part);
    
    // Parse the JSON
    const metadata: UniswapNFTMetadata = JSON.parse(decodedData);
    
    return metadata;
  } catch (error) {
    throw new Error(`Failed to decode NFT metadata: ${(error as Error).message}`);
  }
};

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
  decodeUniswapNFTTokenURI,
}
