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
} from '../web3/jobs';

import {
  NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS,
  MINTING_EVENT_OVERRIDE_TX_HASHES,
  debugMode,
  NETWORK_TO_MAX_BLOCK_RANGE,
} from '../constants';

import {
	TokenTransferEventERC20Repository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
} from "../database/repositories";

import {
  IAssetRecordDB,
} from '../interfaces';

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

import ERC20ABI from '../web3/abis/ERC20ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTransfersAndBalancesERC20 = async (
	tokenERC20: IAssetRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    address: tokenAddress,
    deployment_block: deploymentBlock,
  } = tokenERC20;

  let latestSyncRecord = await SyncTrackRepository.getSyncTrack(tokenAddress, network, 'erc20-sync');

  if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {

    let latestSyncRecordID = latestSyncRecord?.id;
    // Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
    } else {
      let newSyncRecord = await SyncTrackRepository.create({
        latest_block_synced: 0,
        contract_address: tokenAddress,
        meta: "erc20-sync",
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
          event_name: "transferFrom",
          from_block: Number(startBlock),
          genesis_block: Number(earliestBlock),
          meta: "transferFrom"
        }

        let {
          fromBlock,
          toBlock,
          blockRange,
        } = extractFromBlockToBlock(latestBlockNumberWithinRangeLimit, eventIndexBlockTrackerRecord);

        createLog(`Archiving ERC-20 transfer events of ${tokenAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

        let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network];

        let tokenTransferEventFilter = {
          topics : [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            null,
            null,
          ]
        };

        const ERC20Contract = new Contract(tokenAddress, ERC20ABI);
        const erc20Contract = await ERC20Contract.connect(provider);
        
        await Promise.all([
          eventIndexer(erc20Contract, ERC20ABI, tokenTransferEventFilter, latestBlockNumberWithinRangeLimit, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
        ]).then(async ([
          transferEvents,
        ]) => {
          createLog(`${network} had ${transferEvents ? transferEvents.length : 0} Transfer events for token address ${tokenAddress}`);
          
          // clear all existing transfer events for this token
          let deletedRecords = await TokenTransferEventERC20Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
          createLog({deletedRecords});

          // get all transactions associated with transfers
          let transactions = [];
          if(transferEvents) {
            let transactionHashes = transferEvents.map(transferEvent => transferEvent.transactionHash);
            let uniqueTransactionHashes = Array.from(new Set(transactionHashes));
            transactions = await transactionInfoIndexer(uniqueTransactionHashes, network, "ERC-20 Event Txs");
            for(let transaction of transactions) {
              let existingTransactionRecord = await EVMTransactionRepository.findByColumn('hash', transaction.hash);
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
          
          // insert transfers
          let eventIds : string[] = [];
          if(transferEvents) {
            for(let transferEvent of transferEvents) {
              let duplicateEventPreventionId = `${network}-${transferEvent.blockNumber}-${transferEvent.transactionIndex}-${transferEvent.logIndex}`;
              if(eventIds.indexOf(duplicateEventPreventionId) === -1) {
                eventIds.push(duplicateEventPreventionId);
                let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                let existingTokenTransferEventRecord = await TokenTransferEventERC20Repository.findEventByEventFingerprint(eventFingerprint);
                if(!existingTokenTransferEventRecord) {
                  try {
                    await TokenTransferEventERC20Repository.create({
                      network_name: network,
                      block_number: transferEvent.blockNumber,
                      block_hash: transferEvent.blockHash,
                      transaction_index: transferEvent.transactionIndex,
                      removed: transferEvent.removed,
                      contract_address: transferEvent.address,
                      data: transferEvent.data,
                      topic: JSON.stringify(transferEvent.topics),
                      from: transferEvent.args.from,
                      to: transferEvent.args.to,
                      value: transferEvent.args.value.toString(),
                      transaction_hash: transferEvent.transactionHash,
                      log_index: transferEvent.logIndex,
                      event_fingerprint: eventFingerprint,
                    })
                  } catch (e) {
                    createErrorLog("Unable to create ERC-20 transfer event", e);
                  }
                }
              }
            }

            let allRelevantEvents = await TokenTransferEventERC20Repository.allEventsSinceBlockNumber(tokenAddress, startBlock);

            let sortedTransferEvents = [...allRelevantEvents].sort((a, b) => {

              let resultBlockNumber = 
                new BigNumber(a.block_number).isEqualTo(new BigNumber(b.block_number)) 
                  ? 0 
                  : new BigNumber(a.block_number).isGreaterThan(new BigNumber(b.block_number))
                    ? 1
                    : -1;

              let resultTransactionIndex = 
                new BigNumber(a.transaction_index).isEqualTo(new BigNumber(b.transaction_index)) 
                  ? 0 
                  : new BigNumber(a.transaction_index).isGreaterThan(new BigNumber(b.transaction_index))
                    ? 1
                    : -1;

              let resultLogIndex = 
                new BigNumber(a.log_index).isEqualTo(new BigNumber(b.log_index)) 
                  ? 0 
                  : new BigNumber(a.log_index).isGreaterThan(new BigNumber(b.log_index))
                    ? 1
                    : -1;

              return resultBlockNumber || resultTransactionIndex || resultLogIndex;

            })

            // hide individual balance change logs if there are more than 100 transfers being processed (for performance reasons), unless debugMode is on
            let hideBalanceChangeLogs = sortedTransferEvents.length > 100 && !debugMode;
            if(hideBalanceChangeLogs) {
              createLog(`Hiding individual balance change logs for ${sortedTransferEvents.length} transfer events`);
            }
      
            for(let event of sortedTransferEvents) {
              let { from, to, value, transaction_hash } = event;
              let bnValue = new BigNumber(value.toString());
      
              if(from === '0x0000000000000000000000000000000000000000' || (MINTING_EVENT_OVERRIDE_TX_HASHES.indexOf(transaction_hash) > -1)) {
                // is a minting event, has no existing holder to reduce value on, increase value of `to`
                if(bnValue.isGreaterThan(new BigNumber(0))) {
                  // event Transfer
                  // increase value of `to`
                  // increaseFungibleTokenHolderBalance method creates record if there isn't an existing balance to modify
                  await BalanceRepository.increaseFungibleTokenHolderBalance(to, tokenAddress, network, bnValue.toString(), event, hideBalanceChangeLogs);
                }
              } else {
                // is a transfer from an existing holder to another address, reduce value of `from`, increase value of `to`
                if(bnValue.isGreaterThan(new BigNumber(0))) {
                  // event TransferSingle
                  // decrease value of `from`
                  await BalanceRepository.decreaseFungibleTokenHolderBalance(from, tokenAddress, network, bnValue.toString(), event, hideBalanceChangeLogs);
                  // increase value of `to`
                  await BalanceRepository.increaseFungibleTokenHolderBalance(to, tokenAddress, network, bnValue.toString(), event, hideBalanceChangeLogs);
                }
              }
            }
          }

          // Update Sync Track Record
          if(latestSyncRecordID) {
            const blockInfoBatch = await fetchBlockInfoBatchRetryOnFailure([utils.hexlify(latestBlockNumberWithinRangeLimit)], network);
            let blockNumberToBlockInfo : {[key: string]: any} = {};
            for(let blockInfoEntry of blockInfoBatch) {
              blockNumberToBlockInfo[blockInfoEntry.id] = blockInfoEntry?.result?.timestamp ? Number(blockInfoEntry.result.timestamp).toString() : 0;
            }
            await SyncTrackRepository.update({
              latest_block_synced: latestBlockNumberWithinRangeLimit,
              latest_block_timestamp: blockNumberToBlockInfo[utils.hexlify(latestBlockNumberWithinRangeLimit)] ? blockNumberToBlockInfo[utils.hexlify(latestBlockNumberWithinRangeLimit)] : 0,
            }, latestSyncRecordID);
          }

          createLog(`Completed ERC-20 transfer event sync of ${tokenAddress} on ${network} (${blockRange} blocks synced)`);

        })

      }

    } else {
      createLog(`Skipping sync of ${tokenAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumberWithinRangeLimit})`);
    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false}, latestSyncRecordID);
    }

  } else {
    createLog(`Already busy with syncing ERC-20 transfer events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}