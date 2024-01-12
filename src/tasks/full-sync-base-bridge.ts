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
	TokenTransferEventERC721Repository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
  BaseWithdrawalInitiatedEventRepository,
  BaseWithdrawalProvenEventRepository,
  BaseWithdrawalFinalizedEventRepository,
  BaseDepositBridgeInitiatedEventRepository,
} from "../database/repositories";

import {
  IBaseL2StandardBridgeContract,
  IMessagePassedEvent,
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

import OptimismPortalABI from '../web3/abis/OptimismPortalABI.json';
import BaseL2StandardBridgeABI from '../web3/abis/BaseL2StandardBridgeABI.json';
import L2ToL1MessagePasserABI from '../web3/abis/L2ToL1MessagePasserABI.json';
import L1StandardBridgeABI from '../web3/abis/L1StandardBridgeABI.json';
// import OptimismMintableERC20ABI from '../web3/abis/OptimismMintableERC20ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncBaseBridge = async (
	baseL2StandardBridgeContract: IBaseL2StandardBridgeContract,
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
    if(meta === "BaseL2StandardBridge") {
      contractABI = BaseL2StandardBridgeABI;
    } else if (meta === "OptimismPortal") {
      contractABI = OptimismPortalABI;
    } else if (meta === "L1StandardBridge") {
      contractABI = L1StandardBridgeABI;
    } 
    // else if (meta === "OptimismMintableERC20") {
    //   contractABI = OptimismMintableERC20ABI;
    // }

    if(contractABI) {

      let syncTrackIdentifier = `${meta}-${event}`;

      let latestSyncRecord = await SyncTrackRepository.getSyncTrack(contractAddress, network, syncTrackIdentifier);

      let minSecondsBeforeBypass = 60 * 3; // we will allow an in_progress bypass if the previous sync has exceeded 2 minutes
      let shouldBypassInProgress = true; // only enable this once the bridge is in sync / near tip (don't enable if still busy with initial sync)
      let triggerForceBypassInProgress;
      if(shouldBypassInProgress && latestSyncRecord.progress_started_timestamp) {
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
              event_name: "transferFrom",
              from_block: Number(startBlock),
              genesis_block: Number(earliestBlock),
              meta: "transferFrom"
            }

            let {
              fromBlock,
              toBlock,
              blockRange,
            } = extractFromBlockToBlock(latestBlockNumber, eventIndexBlockTrackerRecord);

            createLog(`Archiving ${meta} ${event} event sync of ${contractAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

            let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

            let eventFilter;
            if(meta === "BaseL2StandardBridge") {
              if(event === "WithdrawalInitiated") {
                eventFilter = {
                  topics : [
                    "0x73d170910aba9e6d50b102db522b1dbcd796216f5128b445aa2135272886497e",
                    null,
                    null,
                    null,
                  ]
                };
              }
            } else if (meta === "OptimismPortal") {
              if(event === "WithdrawalProven") {
                eventFilter = {
                  topics : [
                    "0x67a6208cfcc0801d50f6cbe764733f4fddf66ac0b04442061a8a8c0cb6b63f62",
                    null,
                    null,
                    null,
                  ]
                };
              }
              if(event === "WithdrawalFinalized") {
                eventFilter = {
                  topics : [
                    "0xdb5c7652857aa163daadd670e116628fb42e869d8ac4251ef8971d9e5727df1b",
                    null,
                  ]
                };
              }
            } else if (meta === "L1StandardBridge") {
              if(event === "ERC20BridgeInitiated") {
                eventFilter = {
                  topics : [
                    "0x7ff126db8024424bbfd9826e8ab82ff59136289ea440b04b39a0df1b03b9cabf",
                    null,
                  ]
                };
              }
            }

            console.log({event, eventFilter})

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
                if(event === "WithdrawalInitiated") {
                  let deletedRecords = await BaseWithdrawalInitiatedEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock);
                  createLog({deletedRecords});
                } else if(event === "WithdrawalProven") {
                  let deletedRecords = await BaseWithdrawalProvenEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock);
                  createLog({deletedRecords});
                } else if(event === "WithdrawalFinalized") {
                  let deletedRecords = await BaseWithdrawalFinalizedEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock);
                  createLog({deletedRecords});
                } else if(event === "ERC20BridgeInitiated") {
                  let deletedRecords = await BaseDepositBridgeInitiatedEventRepository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(network, contractAddress, startBlock);
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
                  if(event === "WithdrawalInitiated") {
                    let transactionHashes = fetchedEvents.map(fetchedEvent => fetchedEvent.transactionHash);
                    let uniqueTransactionHashes = Array.from(new Set(transactionHashes));
                    transactionReceipts = await transactionReceiptIndexer(uniqueTransactionHashes, network, `${meta} ${event} Event Tx Receipts`);
                    for(let transferEvent of fetchedEvents) {
                      let transactionReceipt = transactionReceipts.find((transactionReceiptEntry) => {
                        if(transactionReceiptEntry.transactionHash === transferEvent.transactionHash) {
                          return true;
                        }
                        return false;
                      });
                      const messageLog = transactionReceipt.logs.find((log: Log) => {
                        if (log.address === BASE_L2_L1_MESSAGE_PASSER_ADDRESS) {
                          let parsedMessage = decodeEventLog({
                            abi: L2ToL1MessagePasserABI,
                            data: log.data,
                            topics: log.topics,
                          }) as IMessagePassedEvent;
                          return parsedMessage.eventName === 'MessagePassed';
                        }
                        return false;
                      }) as Log;
                      let parsedMessage: IMessagePassedEvent | undefined = undefined;
                      if(messageLog) {
                        parsedMessage = decodeEventLog({
                          abi: L2ToL1MessagePasserABI,
                          data: messageLog.data,
                          topics: messageLog.topics,
                        }) as IMessagePassedEvent;
                      }
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await BaseWithdrawalInitiatedEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await BaseWithdrawalInitiatedEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            l1_token_address: transferEvent.args.l1Token,
                            l2_token_address: transferEvent.args.l2Token,
                            from: transferEvent.args.from,
                            to: transferEvent.args.to,
                            amount: transferEvent.args.amount ? transferEvent.args.amount.toString() : "0",
                            extra_data: transferEvent.args.extraData,
                            transaction_hash: transferEvent.transactionHash,
                            log_index: transferEvent.logIndex,
                            event_fingerprint: eventFingerprint,
                            ...(parsedMessage?.args.withdrawalHash && { withdrawal_hash: parsedMessage.args.withdrawalHash })
                          })
                        } catch (e) {
                          createErrorLog(`Unable to create ${meta} ${event} event`, e);
                        }
                      }
                    }
                  }
                  if(event === "WithdrawalProven") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await BaseWithdrawalProvenEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await BaseWithdrawalProvenEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            withdrawal_hash: transferEvent.args.withdrawalHash,
                            from: transferEvent.args.from,
                            to: transferEvent.args.to,
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
                  if(event === "WithdrawalFinalized") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await BaseWithdrawalFinalizedEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await BaseWithdrawalFinalizedEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            withdrawal_hash: transferEvent.args.withdrawalHash,
                            success: transferEvent.args.success,
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
                  if(event === "ERC20BridgeInitiated") {
                    for(let transferEvent of fetchedEvents) {
                      let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
                      let existingEventRecord = await BaseDepositBridgeInitiatedEventRepository.findEventByEventFingerprint(eventFingerprint);
                      if(!existingEventRecord) {
                        try {
                          await BaseDepositBridgeInitiatedEventRepository.create({
                            network_name: network,
                            block_number: transferEvent.blockNumber,
                            block_hash: transferEvent.blockHash,
                            transaction_index: transferEvent.transactionIndex,
                            removed: transferEvent.removed,
                            contract_address: transferEvent.address,
                            data: transferEvent.data,
                            topic: JSON.stringify(transferEvent.topics),
                            l1_token_address: transferEvent.args.localToken,
                            l2_token_address: transferEvent.args.remoteToken,
                            from: transferEvent.args.from,
                            to: transferEvent.args.to,
                            amount: transferEvent.args.amount ? transferEvent.args.amount.toString() : "0",
                            extra_data: transferEvent.args.extraData,
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