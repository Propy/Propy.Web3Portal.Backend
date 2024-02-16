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
} from '../constants';

import {
  SyncTrackRepository,
  EVMTransactionRepository,
  StakingEventRepository,
  NFTStakingStatusRepository,
} from "../database/repositories";

import {
  IStakingContract,
} from '../interfaces';

import ERC721ABI from '../web3/abis/ERC721ABI.json';

import {
	createLog,
  createErrorLog,
} from '../logger';

import {
  getEventFingerprint
} from '../utils';

import {
  fetchBlockInfoBatchRetryOnFailure,
} from '../web3/jobs/transactionInfoIndexer';

import PRONFTStakingABI from '../web3/abis/PRONFTStakingABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncStaking = async (
	baseL2StandardBridgeContract: IStakingContract,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    address: contractAddress,
    deployment_block: deploymentBlock,
    meta,
    events
  } = baseL2StandardBridgeContract;

  console.log({events})

  for (let event of events) {
    console.log({event});

    let contractABI;
    if(meta === "PRONFTStaking") {
      contractABI = PRONFTStakingABI;
    }

    if(contractABI) {

      let syncTrackIdentifier = `${meta}-${event}`;

      let latestSyncRecord = await SyncTrackRepository.getSyncTrack(contractAddress, network, syncTrackIdentifier);

      let minSecondsBeforeBypass = 60 * 5; // we will allow an in_progress bypass if the previous sync has exceeded 2 minutes
      let shouldBypassInProgress = true; // only enable this once the bridge is in sync / near tip (don't enable if still busy with initial sync)
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
            contract_address: contractAddress,
            meta: syncTrackIdentifier,
            network_name: network,
            in_progress: true,
          });
          latestSyncRecordID = newSyncRecord.id;
        }

        let latestBlockNumber = await getLatestBlockNumberRetryOnFailure(network);
        console.log({latestBlockNumber})
        let startBlock = latestSyncRecord?.latest_block_synced && (Number(latestSyncRecord?.latest_block_synced) > 0) ? Number(latestSyncRecord?.latest_block_synced) + 1 : Number(deploymentBlock);

        if(Number(latestBlockNumber) > (Number(startBlock) + 2)) {

          let earliestBlock;

          let provider = getNetworkProvider(network);

          if(provider) {

            let eventIndexBlockTrackerRecord = {
              from_block: Number(startBlock),
              genesis_block: Number(earliestBlock),
              meta: "staking-sync-block-bounds"
            }

            let {
              fromBlock,
              toBlock,
              blockRange,
            } = extractFromBlockToBlock(latestBlockNumber, eventIndexBlockTrackerRecord);

            createLog(`Archiving ${meta} ${event} event sync of ${contractAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

            let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

            let eventFilter;
            if (meta === "PRONFTStaking") {
              if(event === "EnteredStaking") {
                eventFilter = {
                  topics : [
                    "0x8e364eeaa68ccb34e98f1e1c50d21f4e61a820b0aed2f73037109b1326130885",
                    null,
                    null,
                    null,
                  ]
                };
              }
              if(event === "LeftStaking") {
                eventFilter = {
                  topics : [
                    "0xe069388baff4a699e47f8a520337bf65ef439b10348f5c16ad1ec5954758870c",
                    null,
                    null,
                    null,
                  ]
                };
              }
            }

            if(eventFilter) {

              const rawContract = new Contract(contractAddress, contractABI);
              const connectedContract = await rawContract.connect(provider);

              await Promise.all([
                eventIndexer(connectedContract, contractABI, eventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${meta} ${event} events of ${contractAddress} (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
              ]).then(async ([
                fetchedEvents,
              ]) => {
                createLog(`${network} had ${fetchedEvents ? fetchedEvents.length : 0} ${meta} ${event} events for ${contractAddress}`);
                
                // clear all existing transfer events for this token
                if(event === "EnteredStaking") {
                  let deletedRecords = await StakingEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock, event);
                  createLog({deletedRecords});
                } else if(event === "LeftStaking") {
                  let deletedRecords = await StakingEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock, event);
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

                // table.string("staker").index().notNullable();
                // table.string("token_address").index().notNullable();
                // table.string("token_id").index().notNullable();
                // table.string("pro_amount_entered").nullable();
                // table.string("staking_power_issued").nullable();
                // table.string("pro_amount_with_reward").nullable();
                // table.string("staking_power_burnt").nullable();
                
                // insert transfers
                if(fetchedEvents) {
                  if(event === "EnteredStaking") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await StakingEventRepository.findEventByEventFingerprint(eventFingerprint);
                      console.log({transferEvent});
                      console.log({'transferEvent.args': transferEvent.args});
                      if(!existingEventRecord) {
                        try {
                          await StakingEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            type: event,
                            staker: transferEvent.args.staker,
                            token_address: transferEvent.args.tokenAddress,
                            token_id: transferEvent.args.tokenId.toString(),
                            pro_amount_entered: transferEvent.args.proAmountEntered.toString(),
                            staking_power_issued: transferEvent.args.stakingPowerIssued.toString(),
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
                      }
                      // handle flagging of token as staked
                      let currentStakingStatusRecord = await NFTStakingStatusRepository.getStatusRecord(transferEvent.args.tokenAddress, transferEvent.args.tokenId.toString(), network);
                      if(currentStakingStatusRecord) {
                        if(new BigNumber(transferEvent.blockNumber).isGreaterThan(currentStakingStatusRecord.block_number_of_last_update) && (currentStakingStatusRecord.staking_status === false)) {
                          await NFTStakingStatusRepository.update({ staking_status: true, block_number_of_last_update: transferEvent.blockNumber, last_staking_address: transferEvent.args.staker }, currentStakingStatusRecord.id);
                        }
                      } else {
                        await NFTStakingStatusRepository.create({
                          network_name: network,
                          contract_address: transferEvent.args.tokenAddress,
                          token_id: transferEvent.args.tokenId.toString(),
                          staking_status: true,
                          last_staking_address: transferEvent.args.staker,
                          block_number_of_last_update: transferEvent.blockNumber,
                        })
                      }
                    }
                  }
                  if(event === "LeftStaking") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await StakingEventRepository.findEventByEventFingerprint(eventFingerprint);
                      console.log({transferEvent});
                      console.log({'transferEvent.args': transferEvent.args});
                      if(!existingEventRecord) {
                        try {
                          await StakingEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            type: event,
                            staker: transferEvent.args.staker,
                            token_address: transferEvent.args.tokenAddress,
                            token_id: transferEvent.args.tokenId.toString(),
                            pro_amount_with_reward: transferEvent.args.proAmountWithReward.toString(),
                            staking_power_burnt: transferEvent.args.stakingPowerBurnt.toString(),
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
                      }
                      // handle flagging of token as unstaked
                      let currentStakingStatusRecord = await NFTStakingStatusRepository.getStatusRecord(transferEvent.args.tokenAddress, transferEvent.args.tokenId.toString(), network);
                      if(currentStakingStatusRecord) {
                        if(new BigNumber(transferEvent.blockNumber).isGreaterThan(currentStakingStatusRecord.block_number_of_last_update) && (currentStakingStatusRecord.staking_status === true)) {
                          await NFTStakingStatusRepository.update({ staking_status: false, block_number_of_last_update: transferEvent.blockNumber }, currentStakingStatusRecord.id);
                        }
                      } else {
                        await NFTStakingStatusRepository.create({
                          network_name: network,
                          contract_address: transferEvent.args.tokenAddress,
                          token_id: transferEvent.args.tokenId.toString(),
                          staking_status: false,
                          block_number_of_last_update: transferEvent.blockNumber,
                        })
                      }
                    }
                  }
                }

                // Update Sync Track Record
                if(latestSyncRecordID) {
                  const blockInfoBatch = await fetchBlockInfoBatchRetryOnFailure([utils.hexlify(latestBlockNumber)], network);
                  let blockNumberToBlockInfo : {[key: string]: any} = {};
                  for(let blockInfoEntry of blockInfoBatch) {
                    blockNumberToBlockInfo[blockInfoEntry.id] = blockInfoEntry?.result?.timestamp ? Number(blockInfoEntry.result.timestamp).toString() : 0;
                  }
                  await SyncTrackRepository.update({
                    latest_block_synced: latestBlockNumber,
                    latest_block_timestamp: blockNumberToBlockInfo[utils.hexlify(latestBlockNumber)] ? blockNumberToBlockInfo[utils.hexlify(latestBlockNumber)] : 0,
                  }, latestSyncRecordID);
                }

                createLog(`Completed ${meta} ${event} event sync of ${contractAddress} on ${network} (${blockRange} blocks synced)`);

              })

            } else {
              createLog(`Skipping ${meta} ${event} sync of ${contractAddress} on ${network}, since event filter is undefined (eventFilter: ${eventFilter})`);
            }

          }

        } else {
          createLog(`Skipping ${meta} ${event} sync of ${contractAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumber})`);
        }

        if(latestSyncRecordID) {
          await SyncTrackRepository.update({in_progress: false, progress_started_timestamp: null}, latestSyncRecordID);
        }

      } else {
        createLog(`Already busy with syncing ${meta} ${event} events of ${contractAddress} on ${network}, skipping this additional run`);
      }

    }
  
  }

}