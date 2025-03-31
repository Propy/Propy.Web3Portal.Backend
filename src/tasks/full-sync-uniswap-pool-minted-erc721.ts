import BigNumber from 'bignumber.js';

import { Contract, utils } from 'ethers';

import { getLatestBlockNumberRetryOnFailure } from '../web3/jobs/getLatestBlockNumber';

import {
  extractFromBlockToBlock,
  getNetworkProvider,
} from '../web3/utils';

import {
  eventIndexer,
  transactionInfoIndexer,
  transactionInfoAndEventsIndexer,
} from '../web3/jobs';

import {
  NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS,
  debugMode,
  NETWORK_TO_MAX_BLOCK_RANGE,
} from '../constants';

import {
	TokenTransferEventERC721Repository,
  UniswapPoolMintEventRepository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
} from "../database/repositories";

import {
  IUniswapPoolRecordDB,
} from '../interfaces';

import ERC721ABI from '../web3/abis/ERC721ABI.json';
import UniswapPoolV3ABI from '../web3/abis/UniswapPoolV3ABI.json';

import {
	createLog,
  createErrorLog,
} from '../logger';

import {
  getEventFingerprint,
  getLatestBlockNumberWithinMaxBlockRange,
} from '../utils';

import {
  fetchBlockInfoBatchRetryOnFailure,
} from '../web3/jobs/transactionInfoIndexer';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncUniswapPoolMintedERC721 = async (
	uniswapPool: IUniswapPoolRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    pool_address: poolAddress,
    position_nft_address: tokenAddress,
    deployment_block: deploymentBlock,
  } = uniswapPool;

  let syncMeta = 'uniswap-pool-mint-erc721-sync';

  let latestSyncRecord = await SyncTrackRepository.getSyncTrack(poolAddress, network, syncMeta);

  let minSecondsBeforeBypass = 60 * 5; // we will allow an in_progress bypass if the previous sync has exceeded 10 minutes
  let shouldBypassInProgress = false; // only enable this once the bridge is in sync / near tip (don't enable if still busy with initial sync)
  let triggerForceBypassInProgress;
  if(shouldBypassInProgress && latestSyncRecord?.progress_started_timestamp) {
    if((Math.floor(new Date().getTime() / 1000) - latestSyncRecord.progress_started_timestamp) >= minSecondsBeforeBypass) {
      triggerForceBypassInProgress = true;
    }
  }

  if(!latestSyncRecord?.id || !latestSyncRecord.in_progress || triggerForceBypassInProgress) {

    let latestSyncRecordID = latestSyncRecord?.id;
    // Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: true, progress_started_timestamp: Math.floor(new Date().getTime() / 1000)}, latestSyncRecordID);
    } else {
      let newSyncRecord = await SyncTrackRepository.create({
        latest_block_synced: 0,
        contract_address: poolAddress,
        meta: syncMeta,
        network_name: network,
        in_progress: true,
      });
      latestSyncRecordID = newSyncRecord.id;
    }

    let latestBlockNumber = await getLatestBlockNumberRetryOnFailure(network);
    let startBlock = latestSyncRecord?.latest_block_synced && (Number(latestSyncRecord?.latest_block_synced) > 0) ? Number(latestSyncRecord?.latest_block_synced) + 1 : Number(deploymentBlock);
    let latestBlockNumberWithinRangeLimit = getLatestBlockNumberWithinMaxBlockRange(startBlock, latestBlockNumber, NETWORK_TO_MAX_BLOCK_RANGE[network]);

    if(Number(latestBlockNumberWithinRangeLimit) > (Number(startBlock) + 2)) {

      let earliestBlock;

      let provider = getNetworkProvider(network);

      if(provider) {

        let eventIndexBlockTrackerRecord = {
          event_name: "Mint",
          from_block: Number(startBlock),
          genesis_block: Number(earliestBlock),
          meta: "Mint"
        }

        let {
          fromBlock,
          toBlock,
          blockRange,
        } = extractFromBlockToBlock(latestBlockNumberWithinRangeLimit, eventIndexBlockTrackerRecord);

        createLog(`Archiving Mint events of ${poolAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

        let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

        let tokenMintEventFilter = {
          topics : [
            '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde',
            null,
            null,
            null,
          ]
        };

        const UniswapPoolContract = new Contract(poolAddress, UniswapPoolV3ABI);
        const uniswapPoolContract = await UniswapPoolContract.connect(provider);

        await Promise.all([
          eventIndexer(uniswapPoolContract, UniswapPoolV3ABI, tokenMintEventFilter, latestBlockNumberWithinRangeLimit, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${poolAddress} Mint events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
        ]).then(async ([
          mintEvents,
        ]) => {
          createLog(`${network} had ${mintEvents ? mintEvents.length : 0} Mint events for Uniswap pool address ${poolAddress}`);
          
          // clear all existing transfer events for this token
          // TODO uncomment deletion
          let deletedRecords = await UniswapPoolMintEventRepository.clearRecordsByPoolAddressAboveOrEqualToBlockNumber(poolAddress, startBlock);
          createLog({deletedRecords});

          // get all transactions associated with transfers
          let transactions = [];
          let mintEventFingerprintToTokenId : {[key: string]: string} = {};
          let transactionHashToTimestamp : {[key: string]: string} = {};
          if(mintEvents) {
            let transactionHashes = mintEvents.map(mintEvent => mintEvent.transactionHash);
            let uniqueTransactionHashes = Array.from(new Set(transactionHashes));
            transactions = await transactionInfoAndEventsIndexer(uniqueTransactionHashes, network, "Uniswap Pool Mint ERC-721 Event Txs", UniswapPoolV3ABI);
            for(let transaction of transactions) {
              let existingTransactionRecord = await EVMTransactionRepository.findByColumn('hash', transaction.hash);
              transactionHashToTimestamp[transaction.hash] = transaction.block_timestamp;
              for(let mintEvent of mintEvents) {
                let mintEventFingerprint = getEventFingerprint(network, mintEvent.blockNumber, mintEvent.transactionIndex, mintEvent.logIndex);
                let mintEventIndex = transaction.events.findIndex((entry: any) => {
                  let entryFingerprint = getEventFingerprint(network, new BigNumber(entry.blockNumber).toString(), new BigNumber(entry.transactionIndex).toString(), new BigNumber(entry.logIndex).toString());
                  return entryFingerprint == mintEventFingerprint;
                })
                if(mintEventIndex > -1) {
                  console.log({tokenId: transaction.events[mintEventIndex + 1]?.parsedEvent?.params?.tokenId});
                  mintEventFingerprintToTokenId[mintEventFingerprint] = transaction.events[mintEventIndex + 1]?.parsedEvent?.params?.tokenId?.toString();
                }
              }
              if(!existingTransactionRecord) {
                await EVMTransactionRepository.create({
                  network_name: network,
                  hash: transaction.hash,
                  block_hash: transaction.blockHash,
                  block_number: transaction.blockNumber,
                  block_timestamp: transaction.block_timestamp,
                  from: transaction.from,
                  to: transaction.to,
                  gas: transaction.gas,
                  input: transaction.input,
                  nonce: transaction.nonce,
                  r: transaction.r,
                  s: transaction.s,
                  v: transaction.v,
                  transaction_index: transaction.transactionIndex,
                  type: transaction.type,
                  value: transaction.value,
                })
              }
            }
          }
          
          // insert mints
          if(mintEvents) {
            for(let mintEvent of mintEvents) {
              let eventFingerprint = getEventFingerprint(network, mintEvent.blockNumber, mintEvent.transactionIndex, mintEvent.logIndex);
              let tokenIdAssociatedWithMintEvent = mintEventFingerprintToTokenId[eventFingerprint];
              console.log({tokenIdAssociatedWithMintEvent, 'mintEvent.transactionHash': mintEvent.transactionHash})
              let existingTokenTransferEventRecord = await UniswapPoolMintEventRepository.findEventByEventFingerprint(eventFingerprint);
              if(!existingTokenTransferEventRecord) {
                try {
                  await UniswapPoolMintEventRepository.create({
                    network_name: network,
                    block_number: mintEvent.blockNumber,
                    block_hash: mintEvent.blockHash,
                    transaction_index: mintEvent.transactionIndex,
                    removed: mintEvent.removed,
                    pool_address: mintEvent.address,
                    data: mintEvent.data,
                    topic: JSON.stringify(mintEvent.topics),
                    // event-specific args
                    sender: mintEvent.args.sender,
                    owner: mintEvent.args.owner,
                    tick_lower: mintEvent.args.tickLower,
                    tick_upper: mintEvent.args.tickUpper,
                    amount: mintEvent.args.amount,
                    amount0: mintEvent.args.amount0,
                    amount1: mintEvent.args.amount1,
                    // event-specific shim
                    token_id: tokenIdAssociatedWithMintEvent,
                    position_nft_address: tokenAddress,
                    transaction_hash: mintEvent.transactionHash,
                    log_index: mintEvent.logIndex,
                    event_fingerprint: eventFingerprint,
                  })
                } catch (e) {
                  createErrorLog("Unable to create Uniswap pool Mint event", e);
                }
              }
            }

          }

          // Update Sync Track Record
          if(latestSyncRecordID) {
            const blockInfoBatch = await fetchBlockInfoBatchRetryOnFailure([utils.hexValue(latestBlockNumberWithinRangeLimit)], network, [latestBlockNumberWithinRangeLimit.toString()]);
            let blockNumberToBlockInfo : {[key: string]: any} = {};
            for(let blockInfoEntry of blockInfoBatch) {
              blockNumberToBlockInfo[blockInfoEntry.id] = blockInfoEntry?.result?.timestamp ? Number(blockInfoEntry.result.timestamp).toString() : 0;
            }
            await SyncTrackRepository.update({
              latest_block_synced: latestBlockNumberWithinRangeLimit,
              latest_block_timestamp: blockNumberToBlockInfo[utils.hexValue(latestBlockNumberWithinRangeLimit)] ? blockNumberToBlockInfo[utils.hexValue(latestBlockNumberWithinRangeLimit)] : 0,
            }, latestSyncRecordID);
          }

          createLog(`Completed ERC-721 Mint event sync of Uniswap LP pool ${poolAddress} on ${network} (${blockRange} blocks synced)`);

        })

      }

    } else {
      createLog(`Skipping sync of ${poolAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumberWithinRangeLimit})`);
    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false, progress_started_timestamp: null}, latestSyncRecordID);
    }

  } else {
    createLog(`Already busy with syncing ERC-721 Mint event sync of Uniswap LP pool for ${poolAddress} on ${network}, skipping this additional run`);
  }

}