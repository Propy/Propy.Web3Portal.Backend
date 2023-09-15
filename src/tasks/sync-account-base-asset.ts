import BigNumber from 'bignumber.js';
import axios from 'axios';
import { raw } from 'objection';
import { utils } from "ethers";

import {
  sleep
} from '../utils';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

import {
  IBalanceEntry,
  IEtherscanTxERC20,
  INetworkToBalancesERC20,
} from '../interfaces';

import {
  AccountRepository,
  AssetRepository,
  NetworkRepository,
  BalanceRepository,
} from '../database/repositories';

import {
  getBalanceOfERC20,
} from '../web3/jobs'
import e from 'express';

import {
  debugMode,
  baseAssetIdToSymbol,
  ETHERSCAN_API_KEY,
  ARBISCAN_API_KEY,
} from '../constants';

import {
	createLog,
  createErrorLog,
} from '../logger';

let pageSize = 1000;

interface ITokenAddressToBalance {
  [key: string]: IBalanceEntry
}

const setBaseAssetBalance = async (
  account: string,
  network: string,
  baseAssetSymbol: string,
  balance: string,
) => {
  // Check if balance record exists for this address
  let existingBalanceRecord = await BalanceRepository.getBalanceByAssetAndHolder(baseAssetSymbol, account, network);
  if(!existingBalanceRecord) {
    // Create balance record
    await BalanceRepository.create({
      network_name: network,
      asset_address: baseAssetSymbol,
      holder_address: account,
      balance: balance,
    })
  } else {
    // Update balance record
    await BalanceRepository.update({
      balance: balance,
    }, existingBalanceRecord.id);
  }
}

let maxRetries = 3;

const getAndSetBaseAssetBalance = async (
  account: string,
  network: string,
  retryCount: number = 0,
) => {
  try {
    let baseAssetSymbol = baseAssetIdToSymbol[network];
    if(['ethereum', 'optimism', 'arbitrum'].indexOf(network) > -1) {
      let url;
      if(network === 'ethereum') {
        url = `https://api.etherscan.io/api?module=account&action=balance&address=${account}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      }
      if(network === 'optimism') {
        url = `https://api-optimistic.etherscan.io/api?module=account&action=balance&address=${account}&tag=latest`;
      }
      if(network === 'arbitrum') {
        url = `https://api.arbiscan.io/api?module=account&action=balance&address=${account}&tag=latest&apikey=${ARBISCAN_API_KEY}`;
      }
      if(url) {
        if(debugMode) {
          createLog(`Fetching base asset balance of ${account} on ${network}`);
          createLog(`Using URL: ${url}`);
        }
        let response = await axios.get(
          url,
          {
            headers: { "Accept-Encoding": "gzip,deflate,compress" }
          }
        );
        if(response?.data && response?.data?.status === "1" && response?.data?.result) {
          let balance = response?.data?.result;
          await setBaseAssetBalance(account, network, baseAssetSymbol, balance);
          return balance;
        } else {
          // leave balance unchanged and return current balance
          let existingBalanceRecord = await BalanceRepository.getBalanceByAssetAndHolder(baseAssetSymbol, account, network);
          if(existingBalanceRecord) {
            return existingBalanceRecord.balance;
          } else {
            return "0";
          }
        }
      } else {
        return "0";
      }
    } else {
      if(network === 'canto') {
        let url = "https://evm.explorer.canto.io/api/eth-rpc";
        let payload = {
          "id":0,
          "jsonrpc":"2.0",
          "method":"eth_getBalance",
          "params":[account,"latest"]
        };
        let response = await axios.post(url, payload, {
          headers: { "Accept-Encoding": "gzip,deflate,compress" }
        });
        let balanceBN = new BigNumber(response?.data?.result);
        let balance = (response?.data?.result && !balanceBN.isNaN()) ? balanceBN.toString() : "0";
        await setBaseAssetBalance(account, network, baseAssetSymbol, balance);
        return balance;
      }
    }
  } catch (e) {
    retryCount++;
    createLog(`Error fetching base assets for ${account} on ${network}, retryCount: ${retryCount}, error: ${e}`);
    if(retryCount <= maxRetries) {
      let response : string = await getAndSetBaseAssetBalance(account, network, retryCount);
      await sleep(2000 + Math.floor(Math.random() * 5000));
      return response ? response.toString() : "0";
    }
  }
  return "0"
}

export const syncAccountBalanceBaseAsset = async (useTimestampUnix: number, startTime: number, address: string, network: string) => {

  let useTimestampPostgres = new Date(useTimestampUnix * 1000).toISOString();

  try {

    if(debugMode) {
      createLog(`Fetching base asset balance of ${address} on ${network}`);
    }

    // get base asset balance
    let baseAssetBalance = await getAndSetBaseAssetBalance(address, network);
    
    if(debugMode) {
      createLog(`Fetched base asset balance of ${address} on ${network}, exec time: ${new Date().getTime() - startTime}ms`);
    }

    return baseAssetBalance;

  } catch (e) {
    createLog({error: e})
    createErrorLog(`Error encountered in full sync of ${address} on ${network} at ${useTimestampPostgres}, exec time: ${new Date().getTime() - startTime}ms`)
    return null;
  }

}