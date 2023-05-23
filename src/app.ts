import express from "express";
import { Provider } from 'ethers-multicall';
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Model } from "objection";
import Knex from "knex";
import {CronJob} from "cron";
import { providers, utils} from "ethers";
import BigNumber from 'bignumber.js';

import {
  Multicall,
} from 'ethereum-multicall';

import {
  ALCHEMY_API_KEY_ETHEREUM,
	ALCHEMY_API_KEY_OPTIMISM,
	ALCHEMY_API_KEY_ARBITRUM,
	networkToCoingeckoId,
	networkToBaseAssetId,
	baseAssetIdToSymbol,
	debugMode,
} from "./constants"

import routes from "./routes";
import dbConfig from "./config/database";

import {
	AccountRepository,
	AssetRepository,
	NetworkRepository,
} from "./database/repositories";

import {
	getTokenInfoERC20
} from './web3/jobs';

import { runArchiveSyncAccountTransactions } from './tasks/archive-sync-account-transactions';
import {
	fetchCoingeckoPrices,
	fetchBaseAssetCoingeckoPrices,
} from './tasks/fetch-coingecko-prices';
import {
	fullSyncTransfersAndBalancesERC20
} from './tasks/full-sync-transfers-and-balances-erc20';

import { sleep } from "./utils";

import {
	IBalanceEntry,
	ICoingeckoAssetPriceEntry,
	IToken,
	IAddressToMultichainBaseBalance,
	ITokenAddressList,
	IAddressToNetworkToLatestBlock,
	IAddressToMultichainBalances,
} from './interfaces';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

// minutely cycle to run indexer, 10 = 10 minutes (i.e. 10, 20, 30, 40, 50, 60 past the hour).
// recommend to use 10 if doing a full sync, once up to speed, 2 minutes should be safe.
let contractEventIndexerPeriodMinutes = 2;

let corsOptions = {
  origin: ['http://localhost:3000'],
}

dotenv.config();

// DB
const knex = Knex(dbConfig);
Model.knex(knex);

const app = express();
const port = process.env.PORT || 8420;

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

routes(app);

app.listen(port);

console.log(`----- ⚡ SERVER LISTENING ⚡ -----`);
console.log(`-------- ⚡ PORT: ${port} ⚡ --------`);

const runArchiveSync = async (useTimestampUnix: number, startTime: number) => {

	try {
		let accounts = await AccountRepository.getActiveAccounts();

		console.log(`Archive syncing ${accounts.filter((entry: any) => entry.enabled).length} accounts`);

		let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);

		let tempUSD = "0";
		let addressToNetworkToLatestBlock : IAddressToNetworkToLatestBlock = {};
		let tokenAddressToNameToUsd : {[key: string]: {[key: string]: string}} = {} = {};
		let tokenAddressList: ITokenAddressList = {};
		let networkToCoingeckoPrices : {[key: string]: {[key: string]: ICoingeckoAssetPriceEntry}} = {};
		let addressToMultichainBalances : IAddressToMultichainBalances = {};
		let addressToMultichainBaseBalance : IAddressToMultichainBaseBalance = {};

		for(let account of accounts) {

			let {
				address,
				ethereum_enabled,
				optimism_enabled,
				arbitrum_enabled,
				canto_enabled,
			} = account;

			address = utils.getAddress(address);

			let networks = [];

			if(ethereum_enabled) {
				networks.push("ethereum");
			}
			if(optimism_enabled) {
				networks.push("optimism");
			}
			if(arbitrum_enabled) {
				networks.push("arbitrum");
			}
			if(canto_enabled) {
				networks.push("canto");
			}

			await Promise.all(networks.map((network) => 
				runArchiveSyncAccountTransactions(
					network,
					address,
					postgresTimestamp,
				)
			))

		}

		// Get base asset values
		let baseAssetQueryString = Object.entries(networkToBaseAssetId).map(([key, value]) => value).join(',');
		let baseAssetPrices = await fetchBaseAssetCoingeckoPrices(baseAssetQueryString)
		if(debugMode) {
			console.log({baseAssetPrices})
		}

		// await sleep(3000);

		for(let [network, entries] of Object.entries(tokenAddressList)) {
			if(entries.length > 0) {
				if(debugMode) {
					console.log({network, entries})
				}
				let coingeckoNetwork = networkToCoingeckoId[network];
				// await sleep(2500);
				let coingeckoPrices = await fetchCoingeckoPrices(entries.join(','), coingeckoNetwork);
				networkToCoingeckoPrices[network] = coingeckoPrices;
			}
		}

		for(let [address, networksToBalances] of Object.entries(addressToMultichainBalances)) {
			for(let [network, chainBalances] of Object.entries(networksToBalances)) {
				for(let [tokenAddress, balanceEntry] of Object.entries(chainBalances)) {
					let coingeckoPrice = networkToCoingeckoPrices[network][tokenAddress];
					if(coingeckoPrice?.usd) {
						let tokenBalanceValue = new BigNumber(utils.formatUnits(balanceEntry.balance, balanceEntry.tokenInfo.decimal)).multipliedBy(coingeckoPrice.usd).toString();
						tempUSD = new BigNumber(tempUSD).plus(tokenBalanceValue).toString();
						if(new BigNumber(tokenBalanceValue).isGreaterThan(1)) {
							if(tokenAddressToNameToUsd[balanceEntry.tokenInfo.address]?.[balanceEntry.tokenInfo.symbol]) {
								tokenAddressToNameToUsd[balanceEntry.tokenInfo.address][balanceEntry.tokenInfo.symbol] = new BigNumber(tokenAddressToNameToUsd[balanceEntry.tokenInfo.address][balanceEntry.tokenInfo.symbol]).plus(tokenBalanceValue).toString();
							} else {
								if(!tokenAddressToNameToUsd[balanceEntry.tokenInfo.address]) {
									tokenAddressToNameToUsd[balanceEntry.tokenInfo.address] = {};
									tokenAddressToNameToUsd[balanceEntry.tokenInfo.address][balanceEntry.tokenInfo.symbol] = tokenBalanceValue;
								} else {
									tokenAddressToNameToUsd[balanceEntry.tokenInfo.address][balanceEntry.tokenInfo.symbol] = new BigNumber(tokenAddressToNameToUsd[balanceEntry.tokenInfo.address][balanceEntry.tokenInfo.symbol]).plus(tokenBalanceValue).toString();
								}
							}
						}
					}
				}
			}
		}

		for(let [holder, baseHoldings] of Object.entries(addressToMultichainBaseBalance)) {
			for(let [baseAssetNetwork, baseAssetAmountRaw] of Object.entries(baseHoldings)) {
				let baseAssetKey = networkToBaseAssetId[baseAssetNetwork];
				let baseAssetSymbol = baseAssetIdToSymbol[baseAssetKey];
				let baseAssetPrice = baseAssetPrices?.[baseAssetKey]?.usd;
				if(debugMode) {
					console.log({baseAssetAmountRaw, baseAssetPrice, baseAssetKey, baseAssetSymbol, tokenAddressToNameToUsd})
				}
				if(baseAssetPrice) {
					let baseAssetAmount = new BigNumber(utils.formatUnits(baseAssetAmountRaw, 18)).multipliedBy(baseAssetPrice).toString();
					if(tokenAddressToNameToUsd[baseAssetSymbol]?.[baseAssetSymbol]) {
						tokenAddressToNameToUsd[baseAssetSymbol][baseAssetSymbol] = new BigNumber(tokenAddressToNameToUsd[baseAssetSymbol][baseAssetSymbol]).plus(baseAssetAmount).toString();
					} else {
						if(!tokenAddressToNameToUsd[baseAssetSymbol]) {
							tokenAddressToNameToUsd[baseAssetSymbol] = {};
							tokenAddressToNameToUsd[baseAssetSymbol][baseAssetSymbol] = baseAssetAmount;
						} else {
							tokenAddressToNameToUsd[baseAssetSymbol][baseAssetSymbol] = new BigNumber(tokenAddressToNameToUsd[baseAssetSymbol][baseAssetSymbol]).plus(baseAssetAmount).toString();
						}
					}
					tempUSD = new BigNumber(tempUSD).plus(baseAssetAmount).toString();
				} else {
					throw new Error("Unable to fetch baseAssetPrice");
				}
			}
		}

		let tokenAddressToNameToUsdSorted = Object.entries(tokenAddressToNameToUsd).map(entry => entry[1]).sort((a, b) => {
			let aKey = Object.keys(a)[0]
			let bKey = Object.keys(b)[0]
			return new BigNumber(b[bKey]).minus(a[aKey]).toNumber();
		})

		console.log({
			// addressToNetworkToLatestBlock,
			// tokenAddressToNameToUsd,
			tokenAddressToNameToUsdSorted,
			// addressToMultichainBaseBalance,
			totalUSD: tempUSD,
			'timestamp': new Date().toISOString()
		});
		console.log(`Archive sync of successful, exec time: ${new Date().getTime() - startTime}ms, finished at ${new Date().toISOString()}`)

	} catch (e) {
		console.error("Could not complete sync, error: ", e);
	}
}

const highFrequencyJobs = async () => {
	console.log("Running high-frequency jobs");
	// get tracked ERC-20 tokens
	let trackedTokensERC20 = await AssetRepository.getAssetsByStandard("ERC-20");

	console.log(`Syncing ${trackedTokensERC20.length} ERC-20 token(s)`);
	
	let trackedTokensProgressERC20 = 1;
	for(let trackedTokenERC20 of trackedTokensERC20) {
		console.log({trackedTokenERC20})
		console.log(`Syncing ${trackedTokensProgressERC20} of ${trackedTokensERC20.length} ERC-20 token(s)`);
		let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
		await fullSyncTransfersAndBalancesERC20(trackedTokenERC20.network_name, trackedTokenERC20.address, postgresTimestamp);
	}

	
}

highFrequencyJobs();

export const EthersProviderEthereum = new providers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_ETHEREUM}`);
export const MulticallProviderEthereumLib2 = new Multicall({ ethersProvider: EthersProviderEthereum, tryAggregate: true });

export const EthersProviderOptimism = new providers.AlchemyWebSocketProvider("optimism", ALCHEMY_API_KEY_OPTIMISM);
export const MulticallProviderOptimismLib2 = new Multicall({ ethersProvider: EthersProviderOptimism, tryAggregate: true });

export const EthersProviderArbitrum = new providers.AlchemyWebSocketProvider("arbitrum", ALCHEMY_API_KEY_ARBITRUM);
export const MulticallProviderArbitrumLib2 = new Multicall({ ethersProvider: EthersProviderArbitrum, tryAggregate: true });