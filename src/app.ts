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
	CORS_WHITELIST,
	DAPP_BACKEND_MODE,
} from "./constants"

import routes from "./routes";
import dbConfig from "./config/database";

import {
	AccountRepository,
	AssetRepository,
	NFTRepository,
	MetadataSyncTrackRepository,
	SyncPerformanceLogRepository,
	BaseBridgeContractRepository,
	StakingContractRepository,
	UniswapPoolRepository,
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
	fullSyncBaseBridge
} from './tasks/full-sync-base-bridge';
import {
	fullSyncStaking
} from './tasks/full-sync-staking';
import {
	syncTokenMetadata
} from './tasks/sync-token-metadata';
import {
	sanityCheckTokenMetadata
} from './tasks/sanity-check-token-metadata';
import {
	fullSyncPropyKeysHomeListings,
} from './tasks/full-sync-propykeys-home-listings'
import {
	fullSyncUniswapPoolMintedERC721
} from './tasks/full-sync-uniswap-pool-minted-erc721';

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
  origin: CORS_WHITELIST,
}

dotenv.config();

// DB
const knex = Knex(dbConfig);
Model.knex(knex);

if(DAPP_BACKEND_MODE === "api") {

	createLog(`---- ⚡ RUNNING IN API MODE ⚡ ---`);

	const app = express();
	const port = process.env.PORT || 8420;

	// app.use(cors(corsOptions));
	app.use(cors());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	app.set('trust proxy', true);

	routes(app);

	app.listen(port);

	createLog(`----- ⚡ SERVER LISTENING ⚡ -----`);

	createLog(`-------- ⚡ PORT: ${port} ⚡ --------`);

} else {

	createLog(`--- ⚡ RUNNING IN SYNC MODE ⚡ ---`);

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
	
			let execTimeSeconds1 = Math.floor((new Date().getTime() - startTime) / 1000);
			let totalTime = execTimeSeconds1;
			await SyncPerformanceLogRepository.create({name: "periodic-high-frequency-sync-erc20", sync_duration_seconds: execTimeSeconds1, provider_mode: PROVIDER_MODE});
	
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
	
			let execTimeSeconds2 = Math.floor((new Date().getTime() - startTime) / 1000) - totalTime;
			totalTime += execTimeSeconds2;
			await SyncPerformanceLogRepository.create({name: "periodic-high-frequency-sync-erc721", sync_duration_seconds: execTimeSeconds2, provider_mode: PROVIDER_MODE});
	
			await sanityCheckTokenMetadata();
	
			let execTimeSeconds3 = Math.floor((new Date().getTime() - startTime) / 1000) - totalTime;
			totalTime += execTimeSeconds3;
			await SyncPerformanceLogRepository.create({name: "periodic-high-frequency-sanityCheckTokenMetadata", sync_duration_seconds: execTimeSeconds3, provider_mode: PROVIDER_MODE});
	
			let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);
	
			await SyncPerformanceLogRepository.create({name: "periodic-high-frequency-sync", sync_duration_seconds: execTimeSecondsFull, provider_mode: PROVIDER_MODE});
	
			createLog(`SUCCESS: High-frequency jobs, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)
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
	
	const bridgeSyncJobs = async () => {
		createLog("Running high-frequency jobs");
		let randomSleepOffset = Math.floor(Math.random() * 10000);
		createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
		await sleep(randomSleepOffset);
		let startTime = new Date().getTime();
		// get tracked ERC-20 tokens
		try {
			// get tracked bridge contracts
			let trackedBaseBridgeContracts = await BaseBridgeContractRepository.getSyncContracts();
	
			createLog(`Syncing ${trackedBaseBridgeContracts.length} Base Bridge contract(s)`);
	
			let trackedBaseBridgeContractProgress = 1;
			for(let trackedBaseBridgeContract of trackedBaseBridgeContracts) {
				createLog(`Syncing ${trackedBaseBridgeContract.address} - ${trackedBaseBridgeContract.meta} - ${trackedBaseBridgeContract.network_name} - ${trackedBaseBridgeContractProgress} of ${trackedBaseBridgeContracts.length} Base Bridge contract(s)`);
				let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
				await fullSyncBaseBridge(trackedBaseBridgeContract, postgresTimestamp);
				trackedBaseBridgeContractProgress++;
			}
	
			let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);
	
			await SyncPerformanceLogRepository.create({name: "periodic-bridge-sync", sync_duration_seconds: execTimeSecondsFull, provider_mode: PROVIDER_MODE});
	
			createLog(`SUCCESS: Bridge sync jobs, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)
		} catch (e) {
			createErrorLog(`FAILURE: Bridge sync jobs, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
		}
	}
	
	const bridgeSyncSchedule = process.env.APP_ENV === 'prod' ? '0 */1 * * * *' : '0 */5 * * * *';
	
	const runBridgeSyncJobs = new CronJob(
		bridgeSyncSchedule, // use */1 once synced in prod
		function() {
			bridgeSyncJobs();
		},
		null,
		true,
		'Etc/UTC'
	);
	
	runBridgeSyncJobs.start();
	
	const stakeSyncJobs = async () => {
		createLog("Running high-frequency jobs");
		let randomSleepOffset = Math.floor(Math.random() * 10000);
		createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
		await sleep(randomSleepOffset);
		let startTime = new Date().getTime();
		try {
			// get tracked staking contracts
			let trackedStakingContracts = await StakingContractRepository.getSyncContracts();
	
			createLog(`Syncing ${trackedStakingContracts.length} Staking contract(s)`);
	
			let trackedStakingContractProgress = 1;
			for(let trackedStakingContract of trackedStakingContracts) {
				createLog(`Syncing ${trackedStakingContract.address} - ${trackedStakingContract.meta} - ${trackedStakingContract.network_name} - ${trackedStakingContract} of ${trackedStakingContract.length} Staking contract(s)`);
				let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
				await fullSyncStaking(trackedStakingContract, postgresTimestamp);
				trackedStakingContractProgress++;
			}
	
			let trackedStakingTokensERC721 = await AssetRepository.getStakingSyncAssetsByStandard("ERC-721");
	
			createLog(`Syncing ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
	
			let trackedTokensProgressERC721 = 1;
			for(let trackedTokenERC721 of trackedStakingTokensERC721) {
				createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressERC721} of ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
				let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
				await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
				trackedTokensProgressERC721++;
			}
	
			let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);
	
			await SyncPerformanceLogRepository.create({name: `periodic-staking-sync`, sync_duration_seconds: execTimeSecondsFull, provider_mode: PROVIDER_MODE});
	
			createLog(`SUCCESS: Staking sync jobs, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)
		} catch (e) {
			createErrorLog(`FAILURE: Staking sync jobs, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
		}
	}
	
	const stakeSyncSchedule = process.env.APP_ENV === 'prod' ? '0 */1 * * * *' : '0 */5 * * * *';
	
	const runStakeSyncJobs = new CronJob(
		stakeSyncSchedule, // use */1 once synced in prod
		function() {
			stakeSyncJobs();
		},
		null,
		true,
		'Etc/UTC'
	);
	
	runStakeSyncJobs.start();
	
	const lowFrequencyJobs = async () => {
		createLog("Running low-frequency jobs");
		let randomSleepOffset = Math.floor(Math.random() * 10000);
		createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
		await sleep(randomSleepOffset);
		let startTime = new Date().getTime();
		try {

				let missingMetadataRecordsERC721 = await NFTRepository.getRecordsMissingMetadataByStandard("ERC-721");
				// Break metadata sync up into per-address sync, so that an issue syncing metadata on one token won't prevent others from syncing
				let missingMetadataRecordsByAddress : {[key: string]: any} = {};
				for(let nftWithMissingMetadata of missingMetadataRecordsERC721) {
					if(missingMetadataRecordsByAddress[nftWithMissingMetadata.asset_address]) {
						missingMetadataRecordsByAddress[nftWithMissingMetadata.asset_address].push(nftWithMissingMetadata);
					} else {
						missingMetadataRecordsByAddress[nftWithMissingMetadata.asset_address] = [nftWithMissingMetadata];
					}
				}

				for(let [missingMetadataRecordsERC721AssetAddress, missingMetadataRecordsERC721Batch] of Object.entries(missingMetadataRecordsByAddress)) {
		
					try {

						let latestSyncRecord = await MetadataSyncTrackRepository.getSyncTrack(`erc721-sync-${missingMetadataRecordsERC721AssetAddress}`);
				
						if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {
				
							let latestSyncRecordID = latestSyncRecord?.id;
							// Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
							if(latestSyncRecordID) {
								await MetadataSyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
							} else {
								let newSyncRecord = await MetadataSyncTrackRepository.create({
									name: `erc721-sync-${missingMetadataRecordsERC721AssetAddress}`,
									last_sync_timestamp: "0",
									in_progress: true,
								});
								latestSyncRecordID = newSyncRecord.id;
							}
				
							// Fill any missing metadata records for ERC721 tokens
							if(missingMetadataRecordsERC721Batch && missingMetadataRecordsERC721Batch.length > 0) {
								createLog(`Syncing ${missingMetadataRecordsERC721Batch.length} missing metadata records for ${missingMetadataRecordsERC721AssetAddress}`);
								await syncTokenMetadata(missingMetadataRecordsERC721Batch, "ERC-721");
							} else {
								createLog(`No missing metadata records to sync for ${missingMetadataRecordsERC721AssetAddress}`);
							}
				
							await MetadataSyncTrackRepository.update({in_progress: false, last_sync_timestamp: `${Math.floor(new Date().getTime() / 1000)}`}, latestSyncRecordID);
				
							let execTimeSeconds = Math.floor((new Date().getTime() - startTime) / 1000);
				
							await SyncPerformanceLogRepository.create({name: "periodic-metadata-sync", sync_duration_seconds: execTimeSeconds, provider_mode: PROVIDER_MODE});
				
							createLog(`SUCCESS: Metadata sync for ${missingMetadataRecordsERC721AssetAddress}, exec time: ${execTimeSeconds} seconds, finished at ${new Date().toISOString()}`)
						
						} else {
							createLog(`SKIPPING: Metadata sync already in progress for ${missingMetadataRecordsERC721AssetAddress}, skipping this run to avoid duplicates`);
						}
					} catch (e) {
						createErrorLog(`FAILURE: Metadata sync for ${missingMetadataRecordsERC721AssetAddress}, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
					}
				}
			} catch (e) {
				createErrorLog(`FAILURE: Metadata sync process OVERALL, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
			}
	}
	
	const lowFrequencySchedule = process.env.APP_ENV === 'prod' ? '0 */5 * * * *' : '0 */30 * * * *';
	
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


	const propyKeysListingSyncJob = async () => {
		createLog("Running listing sync jobs");
		let randomSleepOffset = Math.floor(Math.random() * 10000);
		createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
		await sleep(randomSleepOffset);
		let startTime = new Date().getTime();
		let syncEntry;
		if(process.env.APP_ENV === 'prod') {
			syncEntry = {network: "base", contractAddress: "0xa239b9b3E00637F29f6c7C416ac95127290b950E"}
		} else {
			syncEntry = {network: "base-sepolia", contractAddress: "0x45C395851c9BfBd3b7313B35E6Ee460D461d585c"}
		}
		try {

			if(!syncEntry) {
				throw new Error("FAILURE: home listing sync job - no syncEntry");
			}
	
			let syncKey = `propykeys-home-listing-sync-${syncEntry.network}-${syncEntry.contractAddress}`;

			let latestSyncRecord = await MetadataSyncTrackRepository.getSyncTrack(syncKey);
	
			if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {
	
				let latestSyncRecordID = latestSyncRecord?.id;
				// Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
				if(latestSyncRecordID) {
					await MetadataSyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
				} else {
					let newSyncRecord = await MetadataSyncTrackRepository.create({
						name: syncKey,
						last_sync_timestamp: "0",
						in_progress: true,
					});
					latestSyncRecordID = newSyncRecord.id;
				}
	
				// perform the sync
				await fullSyncPropyKeysHomeListings(syncEntry.network);
	
				await MetadataSyncTrackRepository.update({in_progress: false, last_sync_timestamp: `${Math.floor(new Date().getTime() / 1000)}`}, latestSyncRecordID);
	
				let execTimeSeconds = Math.floor((new Date().getTime() - startTime) / 1000);
	
				await SyncPerformanceLogRepository.create({name: syncKey, sync_duration_seconds: execTimeSeconds, provider_mode: PROVIDER_MODE});
	
				createLog(`SUCCESS: PropyKeys Home Listing Sync job, exec time: ${execTimeSeconds} seconds, finished at ${new Date().toISOString()}`)
			
			} else {
				createLog(`SKIPPING: PropyKeys Home Listing Sync job already in progress, skipping this run to avoid duplicates`);
			}
		} catch (e) {
			createErrorLog(`FAILURE: PropyKeys Home Listing Sync job, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
		}
	}
	
	const listingSyncSchedule = process.env.APP_ENV === 'prod' ? '0 0 */6 * * *' : '0 0 */24 * * *';
	
	const runListingSyncJob = new CronJob(
		listingSyncSchedule,
		function() {
			propyKeysListingSyncJob();
		},
		null,
		true,
		'Etc/UTC'
	);
	
	runListingSyncJob.start();

	const uniswapPoolMintSyncJob = async () => {

		createLog("Running uniswap pool mint jobs");
		let randomSleepOffset = Math.floor(Math.random() * 10000);
		createLog(`Sleeping for ${randomSleepOffset} ms to avoid double sync`);
		await sleep(randomSleepOffset);
		let startTime = new Date().getTime();
		try {
			// get tracked uniswap pool contracts
			let trackedUniswapPoolContracts = await UniswapPoolRepository.getSyncContracts();

			createLog(`Syncing ${trackedUniswapPoolContracts.length} Staking contract(s)`);

			let trackedUniswapPoolContractProgress = 1;
			for(let trackedUniswapPoolContract of trackedUniswapPoolContracts) {
				createLog(`Syncing ${trackedUniswapPoolContract.address} - ${trackedUniswapPoolContract.meta} - ${trackedUniswapPoolContract.network_name} - ${trackedUniswapPoolContractProgress} of ${trackedUniswapPoolContracts.length} Uniswap pool contract(s)`);
				let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
				await fullSyncUniswapPoolMintedERC721(trackedUniswapPoolContract, postgresTimestamp);
				trackedUniswapPoolContractProgress++;
			}

			// get tracked Uniswap ERC-721 tokens
			let trackedTokensERC721 = await AssetRepository.getUniswapSyncAssetsByStandard("ERC-721");
	
			createLog(`Syncing ${trackedTokensERC721.length} Uniswap LP ERC-721 token(s)`);
	
			let trackedTokensProgressERC721 = 1;
			for(let trackedTokenERC721 of trackedTokensERC721) {
				console.log({trackedTokenERC721})
				createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressERC721} of ${trackedTokensERC721.length} ERC-721 token(s)`);
				let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
				await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
				// if(trackedTokenERC721.monitor_token_uri_updates) {
				// 	console.log(`Processing token URI updates for ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name}`);
				// 	await fullSyncTokenURIUpdatesERC721(trackedTokenERC721, postgresTimestamp);
				// }
				trackedTokensProgressERC721++;
			}

			let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);

			await SyncPerformanceLogRepository.create({name: `periodic-uniswap-pool-sync`, sync_duration_seconds: execTimeSecondsFull, provider_mode: PROVIDER_MODE});

			createLog(`SUCCESS: Staking sync jobs, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)
		} catch (e) {
			createErrorLog(`FAILURE: Staking sync jobs, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
		}
		
	}

	const uniswapLpSyncSchedule = process.env.APP_ENV === 'prod' ? '0 */1 * * * *' : '0 */5 * * * *';
	
	const runUniswapLpSyncJob = new CronJob(
		uniswapLpSyncSchedule,
		function() {
			uniswapPoolMintSyncJob();
		},
		null,
		true,
		'Etc/UTC'
	);
	
	runUniswapLpSyncJob.start();

}

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

export const EthersProviderBaseSepolia = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["base-sepolia"]);
export const MulticallProviderBaseSepoliaLib2 = new Multicall({ ethersProvider: EthersProviderBaseSepolia, tryAggregate: true, multicallCustomContractAddress: '0xcA11bde05977b3631167028862bE2a173976CA11' });

export const EthersProviderBase = new providers.JsonRpcProvider(NETWORK_TO_ENDPOINT["base"]);
export const MulticallProviderBaseLib2 = new Multicall({ ethersProvider: EthersProviderBase, tryAggregate: true });

(() => {
	console.log(`node heap limit = ${require('v8').getHeapStatistics().heap_size_limit / (1024 * 1024)} Mb`)
})()