const util = require('ethereumjs-util');
const Web3 = require('web3');

import { randomBytes } from 'crypto';

import { utils } from "ethers";

import {
  UserRepository,
} from '../database/repositories';

import {
  VALID_SIGNATURE_ACTIONS,
  NETWORK_TO_ENDPOINT,
  VALID_SIGNATURE_CHAIN_IDS_TO_NETWORK_NAMES,
} from '../constants';

import { createPublicClient, http } from 'viem'
import { mainnet, base, sepolia, baseSepolia } from 'viem/chains'

let viemChains : {[key: string]: any} = {
  "ethereum": mainnet,
  "base": base,
  "sepolia": sepolia,
  "base-sepolia": baseSepolia,
}

/**
 * 
 * @param {string} messageJsonString Message to verify. Must have account, action, nonce and timestamp fields in that order
 * @param {string} signature Signature to verify against. 
 * @param {string} walletAddress 
 * @returns {{ success: boolean, reason: string | undefined }}
 */
const verifySignature = async (
  messageJsonString: string,
  sig: string,
  walletAddress: string,
) => {

  let checksumAddress = '';
  try {
    checksumAddress = utils.getAddress(walletAddress);
  } catch (error) {
    return {
      success: false,
      reason: `invalid wallet address`,
    }
  }

  let userRecord = await UserRepository.findByColumn("address", checksumAddress);
  if(!userRecord) {
    let salt = randomBytes(32).toString('hex');
    await UserRepository.create({address: checksumAddress, salt });
    userRecord = await UserRepository.findByColumn("address", checksumAddress);
  }

  const messageParts = JSON.parse(messageJsonString);
  if(walletAddress.toLowerCase() !== messageParts.account.toLowerCase()){
      return {
          success: false,
          reason: "invalid signature message provided"
      };
  }
  if(userRecord.nonce !== messageParts.nonce){
      return {
          success: false,
          reason: "invalid signature nonce provided"
      };
  }
  if(userRecord.salt !== messageParts.salt){
    return {
        success: false,
        reason: "invalid signature salt provided"
    };
  }
  if(!messageParts.hasOwnProperty('action')){
      return {
          success: false,
          reason: "No signature action provided"
      };
  }
  if(VALID_SIGNATURE_ACTIONS.indexOf(messageParts.action) === -1) {
    return {
      success: false,
      reason: "Invalid action provided"
    };
  }
  if(!messageParts.hasOwnProperty('timestamp')){
      return {
          success: false,
          reason: "No signature timestamp provided"
      };
  }
  if(!messageParts.hasOwnProperty('nonce')){
    return {
        success: false,
        reason: "No signature nonce provided"
    };
  }
  if(!messageParts.hasOwnProperty('salt')){
    return {
        success: false,
        reason: "No signature salt provided"
    };
  }
  if(!messageParts.hasOwnProperty('account')){
      return {
          success: false,
          reason: "No signature account provided"
      };
  }
  if(!messageParts.hasOwnProperty('chain_id')){
    return {
        success: false,
        reason: "No signature chain_id provided"
    };
  }
  let detectedNetwork = VALID_SIGNATURE_CHAIN_IDS_TO_NETWORK_NAMES[messageParts.chain_id];
  if(!detectedNetwork){
    return {
        success: false,
        reason: "Unsupported chain ID, please switch to supported network"
    };
  }
  const signatureMaxLifespan = process.env.SIGNATURE_MAX_LIFESPAN ? Number(process.env.SIGNATURE_MAX_LIFESPAN) : 60 * 10;
  let currentTimestamp = Math.floor(new Date().getTime() / 1000);
  let secondsDifference = currentTimestamp - messageParts.timestamp;

  if(secondsDifference > signatureMaxLifespan) {
      return {
          success: false,
          reason: `Signature too old`
      };
  }

  const reconstructedMessage =  JSON.stringify({
    account: checksumAddress,
    action: messageParts.action,
    ...(messageParts.metadata && { metadata: messageParts.metadata }),
    timestamp: messageParts.timestamp,
    chain_id: messageParts.chain_id,
    nonce: messageParts.nonce,
    salt: messageParts.salt,
  }, null, 4)

  const viemClient = createPublicClient({ 
    chain: viemChains[detectedNetwork], 
    transport: http(NETWORK_TO_ENDPOINT[detectedNetwork]), 
  })
  
  const verifySignedMessageViem = async (
    plaintextMessage: string,
    signedMessage: `0x${string}`,
    signerAddress: `0x${string}`,
  ) => {
    const valid = await viemClient.verifyMessage({
      address: signerAddress,
      message: plaintextMessage,
      signature: signedMessage,
    });
    return valid;
  }

  let viemVerification = await verifySignedMessageViem(reconstructedMessage, sig as `0x${string}`, walletAddress as `0x${string}`);

  if(!viemVerification){
      return {
          success: false,
          reason: `invalid signature message provided`
      };
  }

  // Increment account nonce and regenerate salt
  try {
    let newSalt = randomBytes(32).toString('hex');
    let newNonce = userRecord.nonce + 1;
    await UserRepository.update({ salt: newSalt, nonce: newNonce }, userRecord.id);
  } catch {
    return {
      success: false,
      reason: `Error updating user salt and nonce`,
    }
  }

  return {
      success: true,
      action: messageParts.action,
      metadata: messageParts.metadata,
      timestamp: messageParts.timestamp,
  };
}

export {
  verifySignature
}