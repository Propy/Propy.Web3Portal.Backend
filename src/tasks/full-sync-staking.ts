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
  getEventFingerprint,
  getLatestBlockNumberWithinMaxBlockRange,
} from '../utils';

import {
  fetchBlockInfoBatchRetryOnFailure,
} from '../web3/jobs/transactionInfoIndexer';

import PRONFTStakingABI from '../web3/abis/PRONFTStakingABI.json';
import PRONFTStakingV2ABI from '../web3/abis/PRONFTStakingV2ABI.json';
import LPStakingV3ModuleABI from '../web3/abis/LPStakingV3ModuleABI.json'
import PropyKeyStakingV3ModuleABI from '../web3/abis/PropyKeyStakingV3ModuleABI.json'
import PROStakingV3ModuleABI from '../web3/abis/ERC20StakingV3ModuleABI.json'

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
    } else if (meta === "PRONFTStakingV2") {
      contractABI = PRONFTStakingV2ABI;
    } else if (meta === "PRONFTStakingV3_PK") {
      contractABI = PropyKeyStakingV3ModuleABI;
    } else if (meta === "PRONFTStakingV3_LP") {
      contractABI = LPStakingV3ModuleABI;
    } else if (meta === "PRONFTStakingV3_PRO") {
      contractABI = PROStakingV3ModuleABI;
    }

    if(contractABI) {

      let  syncTrackIdentifier = `${meta}-${event}-${contractAddress}`;
      if(["PRONFTStaking", "PRONFTStakingV2"].indexOf(meta) > -1) {
        // legacy IDs
        syncTrackIdentifier = `${meta}-${event}`;
      }

      let latestSyncRecord = await SyncTrackRepository.getSyncTrack(contractAddress, network, syncTrackIdentifier);

      let minSecondsBeforeBypass = 60 * 5; // we will allow an in_progress bypass if the previous sync has exceeded 2 minutes
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
        let latestBlockNumberWithinRangeLimit = getLatestBlockNumberWithinMaxBlockRange(startBlock, latestBlockNumber, NETWORK_TO_MAX_BLOCK_RANGE[network]);

        if(Number(latestBlockNumberWithinRangeLimit) > (Number(startBlock) + 2)) {

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
            } = extractFromBlockToBlock(latestBlockNumberWithinRangeLimit, eventIndexBlockTrackerRecord);

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
            } else if (meta === "PRONFTStakingV2") {
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
            } else if (meta === "PRONFTStakingV3_PK") {
              if(event === "EnteredStakingPropyKeys") {
                eventFilter = {
                  topics: [
                    "0xd2981b475235fe2c50b8ad4d107a7f88858a3dc212bbc103df10d2dd02a5a771",
                    null,
                    null,
                    null,
                  ]
                }
              }
              if(event === "LeftStakingPropyKeys") {
                eventFilter = {
                  topics: [
                    "0x871a16be609784b7ef6cd32b41a2c777ac45746e08735a67c4660eeb73d969b1",
                    null,
                    null,
                    null,
                  ]
                }
              }
              if(event === "EarlyLeftStakingPropyKeys") {
                eventFilter = {
                  topics: [
                    "0xe988623a2124d2ca1f0eb80ceddbc9a5accc4e99e39fa359cc60d423ee40842a",
                    null,
                    null,
                    null,
                  ]
                }
              }
            } else if (meta === "PRONFTStakingV3_LP") {
              if(event === "EnteredStakingLP") {
                eventFilter = {
                  topics: [
                    "0x70f344fddccd2dd0c370fee168c290153e07ca7f8ee3dbcf2aac385743f9f7df",
                    null,
                    null,
                    null,
                  ]
                }
              }
              if(event === "LeftStakingLP") {
                eventFilter = {
                  topics: [
                    "0x9bac8abf873b15af4c116037a2d5264b83a0f79fbb0d4c16b2bb84405bd655a7",
                    null,
                    null,
                    null,
                  ]
                }
              }
              if(event === "EarlyLeftStakingLP") {
                eventFilter = {
                  topics: [
                    "0x46dde79312ef3c980e6de363394efd7f00e2bb5b7e70e413ce5dcfd8b459c35c",
                    null,
                    null,
                    null,
                  ]
                }
              }
            } else if (meta === "PRONFTStakingV3_PRO") {
              if(event === "EnteredStakingERC20") {
                eventFilter = {
                  topics: [
                    "0x01b8f98a7fc509ed5ba0d5a901d7b97103440f1666644bb9effdcc8547171564",
                    null,
                    null,
                  ]
                }
              }
              if(event === "LeftStakingERC20") {
                eventFilter = {
                  topics: [
                    "0x2f3aa744c4aa1174c4a3d4d23b8bf9f99aa7117ec0267326a4edd1ed5d458ec2",
                    null,
                    null,
                  ]
                }
              }
              if(event === "EarlyLeftStakingERC20") {
                eventFilter = {
                  topics: [
                    "0x5d178a819db7ace7bbd2de432498b7b85bf33973213136df3fc70db33237747f",
                    null,
                    null,
                  ]
                }
              }
            }

            if(eventFilter) {

              const rawContract = new Contract(contractAddress, contractABI);
              const connectedContract = await rawContract.connect(provider);

              await Promise.all([
                eventIndexer(connectedContract, contractABI, eventFilter, latestBlockNumberWithinRangeLimit, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${meta} ${event} events of ${contractAddress} (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
              ]).then(async ([
                fetchedEvents,
              ]) => {
                createLog(`${network} had ${fetchedEvents ? fetchedEvents.length : 0} ${meta} ${event} events for ${contractAddress}`);
                
                // clear all existing transfer events for this token
                if(event === "EnteredStaking" || event === "EnteredStakingLP" || event === "EnteredStakingERC20" || event === "EnteredStakingPropyKeys") {
                  let deletedRecords = await StakingEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock, event);
                  createLog({deletedRecords});
                } else if(event === "LeftStaking" || event === "LeftStakingLP" || event === "EarlyLeftStakingLP" || event === "LeftStakingERC20" || event === "EarlyLeftStakingERC20" || event === "LeftStakingPropyKeys" || event === "EarlyLeftStakingPropyKeys") {
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
                  // V3 Events
                  if(event === "EnteredStakingLP" || event === "EnteredStakingPropyKeys") {
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
                            virtual_pro_amount_entered: transferEvent.args.virtualProAmountEntered.toString(),
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
                  if(event === "LeftStakingLP" || event === "LeftStakingPropyKeys") {
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
                            virtual_pro_amount_removed: transferEvent.args.virtualProRemoved.toString(),
                            pro_reward: transferEvent.args.proReward.toString(),
                            staking_power_burnt: transferEvent.args.stakingPowerBurnt.toString(),
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
                  if(event === "EarlyLeftStakingLP" || event === "EarlyLeftStakingPropyKeys") {
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
                            virtual_pro_amount_removed: transferEvent.args.virtualProRemoved.toString(),
                            pro_reward_foregone: transferEvent.args.proRewardForegone.toString(),
                            staking_power_burnt: transferEvent.args.stakingPowerBurnt.toString(),
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
                  if(event === "EnteredStakingERC20") {
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
                    }
                  }
                  if(event === "LeftStakingERC20") {
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
                            pro_amount_removed: transferEvent.args.proAmountRemoved.toString(),
                            pro_reward: transferEvent.args.proReward.toString(),
                            staking_power_burnt: transferEvent.args.stakingPowerBurnt.toString(),
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
                      }
                    }
                  }
                  if(event === "EarlyLeftStakingERC20") {
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
                            pro_amount_removed: transferEvent.args.proAmountRemoved.toString(),
                            pro_reward_foregone: transferEvent.args.proRewardForegone.toString(),
                            staking_power_burnt: transferEvent.args.stakingPowerBurnt.toString(),
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
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

                createLog(`Completed ${meta} ${event} event sync of ${contractAddress} on ${network} (${blockRange} blocks synced)`);

              })

            } else {
              createLog(`Skipping ${meta} ${event} sync of ${contractAddress} on ${network}, since event filter is undefined (eventFilter: ${eventFilter})`);
            }

          }

        } else {
          createLog(`Skipping ${meta} ${event} sync of ${contractAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumberWithinRangeLimit})`);
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