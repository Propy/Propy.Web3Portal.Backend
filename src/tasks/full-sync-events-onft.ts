import BigNumber from 'bignumber.js';

import { Contract, utils } from 'ethers';
import { Log, decodeEventLog } from 'viem';

import { getLatestBlockNumberRetryOnFailure } from '../web3/jobs/getLatestBlockNumber';

import {
  extractFromBlockToBlock,
  getNetworkProvider,
} from '../web3/utils';

import {
  eventIndexer,
  transactionInfoIndexer,
  transactionReceiptIndexer,
} from '../web3/jobs';

import {
  NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS,
  BASE_L2_L1_MESSAGE_PASSER_ADDRESS,
  debugMode,
  NETWORK_TO_MAX_BLOCK_RANGE,
} from '../constants';

import {
	TokenTransferEventERC721Repository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
  ONFTContractRepository,
  ONFTSentEventRepository,
  ONFTReceivedEventRepository,
} from "../database/repositories";

import {
  IONFTContractRecordDB,
  IMessagePassedEvent,
} from '../interfaces';

import ONFTContractABI from '../web3/abis/ONFTContractABI.json';

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

import OptimismPortalABI from '../web3/abis/OptimismPortalABI.json';
import BaseL2StandardBridgeABI from '../web3/abis/BaseL2StandardBridgeABI.json';
import L2ToL1MessagePasserABI from '../web3/abis/L2ToL1MessagePasserABI.json';
import L1StandardBridgeABI from '../web3/abis/L1StandardBridgeABI.json';
// import OptimismMintableERC20ABI from '../web3/abis/OptimismMintableERC20ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncEventsONFT = async (
	onftContract: IONFTContractRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    onft_address: onftAddress,
    nft_address: nftAddress,
    source_nft_address: sourceNftAddress,
    source_nft_network_name: sourceNetwork,
    deployment_block: deploymentBlock,
    meta,
    events
  } = onftContract;

  for (let event of events) {

    let contractABI = ONFTContractABI;

    if(contractABI) {

      let syncTrackIdentifier = `${meta}-${event}`;

      let latestSyncRecord = await SyncTrackRepository.getSyncTrack(onftAddress, network, syncTrackIdentifier);

      let minSecondsBeforeBypass = 60 * 5; // we will allow an in_progress bypass if the previous sync has exceeded 5 minutes
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
            contract_address: onftAddress,
            meta: syncTrackIdentifier,
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
              event_name: event,
              from_block: Number(startBlock),
              genesis_block: Number(earliestBlock),
              meta: syncTrackIdentifier
            }

            let {
              fromBlock,
              toBlock,
              blockRange,
            } = extractFromBlockToBlock(latestBlockNumberWithinRangeLimit, eventIndexBlockTrackerRecord);

            createLog(`Archiving ${meta} ${event} event sync of ${onftAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

            let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

            let eventFilter;
            if(event === "ONFTSent") {
              eventFilter = {
                topics : [
                  "0x986156872b2ee0022b9585231dbbfde457f87f8a16b6c45e1a81c54c4ad8351f",
                  null,
                  null,
                ]
              };
            }
            if(event === "ONFTReceived") {
              eventFilter = {
                topics : [
                  "0x7883fa30ea56937810e36990b0bbb8d629d0cf59f68baf8431ff657cebe7eef5",
                  null,
                  null,
                ]
              };
            }

            if(eventFilter) {

              const rawContract = new Contract(onftAddress, contractABI);
              const connectedContract = await rawContract.connect(provider);

              await Promise.all([
                eventIndexer(connectedContract, contractABI, eventFilter, latestBlockNumberWithinRangeLimit, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${meta} ${event} events of ${onftAddress} (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
              ]).then(async ([
                fetchedEvents,
              ]) => {
                createLog(`${network} had ${fetchedEvents ? fetchedEvents.length : 0} ${meta} ${event} events for ${onftAddress}`);
                
                // clear all existing transfer events for this token
                if(event === "ONFTSent") {
                  let deletedRecords = await ONFTSentEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, onftAddress, startBlock);
                  createLog({deletedRecords});
                } else if(event === "ONFTReceived") {
                  let deletedRecords = await ONFTReceivedEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, onftAddress, startBlock);
                  createLog({deletedRecords});
                }

                // get all transactions associated with transfers
                let transactions = [];
                let transactionHashToTimestamp : {[key: string]: string} = {};
                if(fetchedEvents) {
                  let transactionHashes = fetchedEvents.map(fetchedEvent => fetchedEvent.transactionHash);
                  let uniqueTransactionHashes = Array.from(new Set(transactionHashes));
                  transactions = await transactionInfoIndexer(uniqueTransactionHashes, network, `${meta} ${event} Event Txs`);
                  for(let transaction of transactions) {
                    let existingTransactionRecord = await EVMTransactionRepository.findByColumn('hash', transaction.hash);
                    transactionHashToTimestamp[transaction.hash] = transaction.block_timestamp;
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
                
                
                let transactionReceipts = [];
                // insert transfers
                if(fetchedEvents) {
                  if(event === "ONFTReceived") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await ONFTReceivedEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await ONFTReceivedEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            src_eid: transferEvent.args.srcEid,
                            token_id: transferEvent.args.tokenId.toString(),
                            to_address: transferEvent.args.toAddress,
                            guid: transferEvent.args.guid,
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                            onft_address: onftAddress,
                            nft_address: nftAddress,
                            source_nft_address: sourceNftAddress,
                            source_nft_network_name: sourceNetwork,
                            type: 'ONFTReceived',
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
                      }
                    }
                  }
                  if(event === "ONFTSent") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await ONFTSentEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await ONFTSentEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            dst_eid: transferEvent.args.dstEid,
                            token_id: transferEvent.args.tokenId.toString(),
                            from_address: transferEvent.args.fromAddress,
                            guid: transferEvent.args.guid,
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                            onft_address: onftAddress,
                            nft_address: nftAddress,
                            source_nft_address: sourceNftAddress,
                            source_nft_network_name: sourceNetwork,
                            type: 'ONFTSent',
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
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

                createLog(`Completed ${meta} ${event} event sync of ${onftAddress} on ${network} (${blockRange} blocks synced)`);

              })

            } else {
              createLog(`Skipping ${meta} ${event} sync of ${onftAddress} on ${network}, since event filter is undefined (eventFilter: ${eventFilter})`);
            }

          }

        } else {
          createLog(`Skipping ${meta} ${event} sync of ${onftAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlockNumberWithinRangeLimit: ${latestBlockNumberWithinRangeLimit})`);
        }

        if(latestSyncRecordID) {
          await SyncTrackRepository.update({in_progress: false, progress_started_timestamp: null}, latestSyncRecordID);
        }

      } else {
        createLog(`Already busy with syncing ${meta} ${event} events of ${onftAddress} on ${network}, skipping this additional run`);
      }

    }
  
  }

}