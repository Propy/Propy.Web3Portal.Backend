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
  MINTING_EVENT_OVERRIDE_TX_HASHES,
} from '../constants';

import {
	TokenTransferEventERC20Repository,
  SyncTrackRepository,
  BalanceRepository,
} from "../database/repositories";

import {
  IAssetRecordDB,
} from '../interfaces';

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
        network: network,
        in_progress: true,
      });
      latestSyncRecordID = newSyncRecord.id;
    }

    let latestBlockNumber = await getLatestBlockNumber(network);
    let startBlock = latestSyncRecord?.latest_block_synced ? latestSyncRecord?.latest_block_synced : deploymentBlock;

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
        eventIndexer(erc20Contract, ERC20ABI, tokenTransferEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
      ]).then(async ([
        transferEvents,
      ]) => {
        console.log(`${network} had ${transferEvents ? transferEvents.length : 0} Transfer events for token address ${tokenAddress}`);
        
        // clear all existing transfer events for this token
        let deletedRecords = await TokenTransferEventERC20Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
        console.log({deletedRecords});
        
        // insert transfers
        let eventIds : string[] = [];
        if(transferEvents) {
          for(let transferEvent of transferEvents) {
            let duplicateEventPreventionId = `${network}-${transferEvent.blockNumber}-${transferEvent.transactionIndex}-${transferEvent.logIndex}`;
            if(eventIds.indexOf(duplicateEventPreventionId) === -1) {
              eventIds.push(duplicateEventPreventionId);
              await TokenTransferEventERC20Repository.create({
                network: network,
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
              })
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
    
          for(let event of sortedTransferEvents) {
            let { from, to, value, transaction_hash } = event;
            let bnValue = new BigNumber(value.toString());
    
            if(from === '0x0000000000000000000000000000000000000000' || (MINTING_EVENT_OVERRIDE_TX_HASHES.indexOf(transaction_hash) > -1)) {
              // is a minting event, has no existing holder to reduce value on, increase value of `to`
              if(bnValue.isGreaterThan(new BigNumber(0))) {
                // event Transfer
                // increase value of `to`
                // increaseFungibleTokenHolderBalance method creates record if there isn't an existing balance to modify
                await BalanceRepository.increaseFungibleTokenHolderBalance(to, tokenAddress, network, bnValue.toString(), event);
              }
            } else {
              // is a transfer from an existing holder to another address, reduce value of `from`, increase value of `to`
              if(bnValue.isGreaterThan(new BigNumber(0))) {
                // event TransferSingle
                // decrease value of `from`
                await BalanceRepository.decreaseFungibleTokenHolderBalance(from, tokenAddress, network, bnValue.toString(), event);
                // increase value of `to`
                await BalanceRepository.increaseFungibleTokenHolderBalance(to, tokenAddress, network, bnValue.toString(), event);
              }
            }
          }
        }

        // Update Sync Track Record
        if(latestSyncRecordID) {
          await SyncTrackRepository.update({latest_block_synced: latestBlockNumber}, latestSyncRecordID);
        }

        console.log(`Completed ERC-20 transfer event sync of ${tokenAddress} on ${network} (${blockRange} blocks synced)`);

      })

    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false}, latestSyncRecordID);
    }

  } else {
    console.log(`Already busy with syncing ERC-20 transfer events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}