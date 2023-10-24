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
	ALCHEMY_API_KEY_GOERLI,
	ALCHEMY_API_KEY_SEPOLIA,
	networkToCoingeckoId,
	networkToBaseAssetId,
	baseAssetIdToSymbol,
	debugMode,
	NETWORK_TO_ENDPOINT,
	PROVIDER_MODE,
} from "./constants"

import routes from "./routes";
import dbConfig from "./config/database";

import {
	AccountRepository,
	AssetRepository,
	NFTRepository,
	MetadataSyncTrackRepository,
	SyncPerformanceLogRepository,
} from "./database/repositories";

import {
	getTokenInfoERC20
} from './web3/jobs';

import {
	fetchCoingeckoPrices,
	fetchBaseAssetCoingeckoPrices,
} from './tasks/fetch-coingecko-prices';
import {
	fullSyncTransfersAndBalancesERC20
} from './tasks/full-sync-transfers-and-balances-erc20';
import {
	fullSyncTransfersAndBalancesERC721
} from './tasks/full-sync-transfers-and-balances-erc721';
import {
	fullSyncTokenURIUpdatesERC721
} from './tasks/full-sync-tokenuri-updates-erc721';
import {
	syncTokenMetadata
} from './tasks/sync-token-metadata';
import {
	sanityCheckTokenMetadata
} from './tasks/sanity-check-token-metadata';

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

import {
	createLog,
	createErrorLog
} from './logger';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

// minutely cycle to run indexer, 10 = 10 minutes (i.e. 10, 20, 30, 40, 50, 60 past the hour).
// recommend to use 10 if doing a full sync, once up to speed, 2 minutes should be safe.
let contractEventIndexerPeriodMinutes = 2;

let corsOptions = {
  origin: ['http://localhost:4200', 'https://d1i3kxt3ojs9s8.cloudfront.net', 'https://d2yjs5wp5y2gou.cloudfront.net'],
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

createLog(`----- ⚡ SERVER LISTENING ⚡ -----`);

createLog(`-------- ⚡ PORT: ${port} ⚡ --------`);

const highFrequencyJobs = async () => {
	createLog("Running high-frequency jobs");
	let randomSleepOffset = Math.floor(Math.random() * 10000);
	createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
	await sleep(randomSleepOffset);
	let startTime = new Date().getTime();
	// get tracked ERC-20 tokens
	try {
		let trackedTokensERC20 = await AssetRepository.getSyncAssetsByStandard("ERC-20");

		createLog(`Syncing ${trackedTokensERC20.length} ERC-20 token(s)`);
		
		let trackedTokensProgressERC20 = 1;
		for(let trackedTokenERC20 of trackedTokensERC20) {
			createLog(`Syncing ${trackedTokenERC20.symbol} - ${trackedTokensProgressERC20} of ${trackedTokensERC20.length} ERC-20 token(s)`);
			let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
			await fullSyncTransfersAndBalancesERC20(trackedTokenERC20, postgresTimestamp);
		}

		// get tracked ERC-721 tokens
		let trackedTokensERC721 = await AssetRepository.getSyncAssetsByStandard("ERC-721");

		createLog(`Syncing ${trackedTokensERC721.length} ERC-721 token(s)`);

		let trackedTokensProgressERC721 = 1;
		for(let trackedTokenERC721 of trackedTokensERC721) {
			createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressERC721} of ${trackedTokensERC721.length} ERC-721 token(s)`);
			let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
			await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
			if(trackedTokenERC721.monitor_token_uri_updates) {
				console.log(`Processing token URI updates for ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name}`);
				await fullSyncTokenURIUpdatesERC721(trackedTokenERC721, postgresTimestamp);
			}
			trackedTokensProgressERC721++;
		}

		await sanityCheckTokenMetadata();

		let execTimeSeconds = Math.floor((new Date().getTime() - startTime) / 1000);

		await SyncPerformanceLogRepository.create({name: "periodic-high-frequency-sync", sync_duration_seconds: execTimeSeconds, provider_mode: PROVIDER_MODE});

		createLog(`SUCCESS: High-frequency jobs, exec time: ${execTimeSeconds} seconds, finished at ${new Date().toISOString()}`)
	} catch (e) {
		createErrorLog(`FAILURE: High-frequency jobs, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
	}
}

const highFrequencySchedule = process.env.APP_ENV === 'prod' ? '0 */5 * * * *' : '0 */15 * * * *';

const runHighFrequencyJobs = new CronJob(
	highFrequencySchedule, // use */1 once synced in prod
	function() {
		highFrequencyJobs();
	},
	null,
	true,
	'Etc/UTC'
);

runHighFrequencyJobs.start();

const lowFrequencyJobs = async () => {
	createLog("Running low-frequency jobs");
	let randomSleepOffset = Math.floor(Math.random() * 10000);
	createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
	await sleep(randomSleepOffset);
	let startTime = new Date().getTime();
	try {

		let latestSyncRecord = await MetadataSyncTrackRepository.getSyncTrack('erc721-sync');

		if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {

			let latestSyncRecordID = latestSyncRecord?.id;
			// Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
			if(latestSyncRecordID) {
				await MetadataSyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
			} else {
				let newSyncRecord = await MetadataSyncTrackRepository.create({
					name: "erc721-sync",
					last_sync_timestamp: "0",
					in_progress: true,
				});
				latestSyncRecordID = newSyncRecord.id;
			}

			// Fill any missing metadata records for ERC721 tokens
			let missingMetadataRecordsERC721 = await NFTRepository.getRecordsMissingMetadataByStandard("ERC-721");
			if(missingMetadataRecordsERC721 && missingMetadataRecordsERC721.length > 0) {
				createLog(`Syncing ${missingMetadataRecordsERC721.length} missing metadata records`);
				await syncTokenMetadata(missingMetadataRecordsERC721, "ERC-721");
			} else {
				createLog(`No missing metadata records to sync`);
			}

			await MetadataSyncTrackRepository.update({in_progress: false, last_sync_timestamp: `${Math.floor(new Date().getTime() / 1000)}`}, latestSyncRecordID);

			let execTimeSeconds = Math.floor((new Date().getTime() - startTime) / 1000);

			await SyncPerformanceLogRepository.create({name: "periodic-metadata-sync", sync_duration_seconds: execTimeSeconds, provider_mode: PROVIDER_MODE});

			createLog(`SUCCESS: Low-frequency jobs, exec time: ${execTimeSeconds} seconds, finished at ${new Date().toISOString()}`)
		
		} else {
			createLog(`SKIPPING: Metadata sync already in progress, skipping this run to avoid duplicates`);
		}
	} catch (e) {
		createErrorLog(`FAILURE: Low-frequency jobs, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
	}
}

const lowFrequencySchedule = process.env.APP_ENV === 'prod' ? '0 */10 * * * *' : '0 */30 * * * *';

const runLowFrequencyJobs = new CronJob(
	// '0 */40 * * * *',
	lowFrequencySchedule,
	function() {
		lowFrequencyJobs();
	},
	null,
	true,
	'Etc/UTC'
);

runLowFrequencyJobs.start();

export const EthersProviderEthereum = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["ethereum"]);
export const MulticallProviderEthereumLib2 = new Multicall({ ethersProvider: EthersProviderEthereum, tryAggregate: true });

// export const EthersProviderOptimism = new providers.AlchemyWebSocketProvider("optimism", ALCHEMY_API_KEY_OPTIMISM);
// export const MulticallProviderOptimismLib2 = new Multicall({ ethersProvider: EthersProviderOptimism, tryAggregate: true });

export const EthersProviderArbitrum = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["arbitrum"]);
export const MulticallProviderArbitrumLib2 = new Multicall({ ethersProvider: EthersProviderArbitrum, tryAggregate: true });

export const EthersProviderGoerli = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["goerli"]);
export const MulticallProviderGoerliLib2 = new Multicall({ ethersProvider: EthersProviderGoerli, tryAggregate: true });

export const EthersProviderSepolia = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["sepolia"]);
export const MulticallProviderSepoliaLib2 = new Multicall({ ethersProvider: EthersProviderSepolia, tryAggregate: true });

(() => {
	console.log(`node heap limit = ${require('v8').getHeapStatistics().heap_size_limit / (1024 * 1024)} Mb`)
})()