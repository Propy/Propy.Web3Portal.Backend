import BigNumber from 'bignumber.js';

import { Contract, utils } from 'ethers';

import { getLatestBlockNumber } from '../web3/jobs/getLatestBlockNumber';

import {
  extractFromBlockToBlock,
  getNetworkProvider,
} from '../web3/utils';

import {
  eventIndexer,
} from '../web3/jobs';

import {
  NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS,
} from '../constants';

import {
	TokenTransferEventERC20Repository,
  SyncTrackRepository,
} from "../database/repositories";

import ERC20ABI from '../web3/abis/ERC20ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTransfersAndBalancesERC20 = async (
	network: string,
	tokenAddress: string,
  postgresTimestamp?: number,
) => {

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
        network: network,
        in_progress: true,
      });
      latestSyncRecordID = newSyncRecord.id;
    }

    let latestBlockNumber = await getLatestBlockNumber(network);
    let startBlock = latestSyncRecord?.latest_block_synced ? latestSyncRecord?.latest_block_synced : "0";

    let earliestBlock;

    let provider = getNetworkProvider(network);

    if(provider) {

      let eventIndexBlockTrackerRecord = {
        event_name: "transferFrom",
        last_checked_block: Number(startBlock),
        genesis_block: Number(earliestBlock),
        meta: "transferFrom"
      }

      let {
        fromBlock,
        toBlock,
        blockRange,
      } = extractFromBlockToBlock(latestBlockNumber, eventIndexBlockTrackerRecord);

      console.log(`Archiving ERC-20 transfer events of ${tokenAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

      let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network];

      let receiveTokenEventFilter = {
        topics : [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          null,
        ]
      };

      let sendTokenEventFilter = {
        topics : [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          null,
        ]
      }

      const ERC20Contract = new Contract(tokenAddress, ERC20ABI);
      const erc20Contract = await ERC20Contract.connect(provider);

      await Promise.all([
        eventIndexer(erc20Contract, ERC20ABI, receiveTokenEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer Receives (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
        eventIndexer(erc20Contract, ERC20ABI, sendTokenEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer Sends (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`)
      ]).then(async ([
        receiveEvents,
        sendEvents
      ]) => {
        console.log(`${network} had ${receiveEvents ? receiveEvents.length : 0} receive events and ${sendEvents ? sendEvents.length : 0} send events for token address ${tokenAddress}`);
        
        // clear all existing transfer events for this token
        let deletedRecords = await TokenTransferEventERC20Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
        console.log({deletedRecords});
        
        // insert receives
        if(receiveEvents) {
          for(let receiveEvent of receiveEvents) {
            await TokenTransferEventERC20Repository.create({
              network: network,
              block_number: receiveEvent.blockNumber,
              block_hash: receiveEvent.blockHash,
              transaction_index: receiveEvent.transactionIndex,
              removed: receiveEvent.removed,
              contract_address: receiveEvent.address,
              data: receiveEvent.data,
              topic: JSON.stringify(receiveEvent.topics),
              from: receiveEvent.args.from,
              to: receiveEvent.args.to,
              value: receiveEvent.args.value.toString(),
              transaction_hash: receiveEvent.transactionHash,
              log_index: receiveEvent.logIndex,
            })
          }
        }

        // insert sends
        if(sendEvents) {
          for(let sendEvent of sendEvents) {
            await TokenTransferEventERC20Repository.create({
              network: network,
              block_number: sendEvent.blockNumber,
              block_hash: sendEvent.blockHash,
              transaction_index: sendEvent.transactionIndex,
              removed: sendEvent.removed,
              contract_address: sendEvent.address,
              data: sendEvent.data,
              topic: JSON.stringify(sendEvent.topics),
              from: sendEvent.args.from,
              to: sendEvent.args.to,
              value: sendEvent.args.value.toString(),
              transaction_hash: sendEvent.transactionHash,
              log_index: sendEvent.logIndex,
            })
          }
        }

        // Update Sync Track Record
        if(latestSyncRecordID) {
          await SyncTrackRepository.update({latest_block_synced: latestBlockNumber}, latestSyncRecordID);
        }

      })

    }

  } else {
    console.log(`Already busy with syncing ERC-20 transfer events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}