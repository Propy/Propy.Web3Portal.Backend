import BigNumber from 'bignumber.js';

import { Contract, utils } from 'ethers';

import { getLatestBlockNumber } from '../web3/jobs/getLatestBlockNumber';

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
} from '../constants';

import {
	TokenTransferEventERC721Repository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
} from "../database/repositories";

import {
  IAssetRecordDB,
} from '../interfaces';

import ERC721ABI from '../web3/abis/ERC721ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTransfersAndBalancesERC721 = async (
	tokenERC721: IAssetRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    address: tokenAddress,
    deployment_block: deploymentBlock,
  } = tokenERC721;

  let latestSyncRecord = await SyncTrackRepository.getSyncTrack(tokenAddress, network, 'erc721-sync');

  if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {

    let latestSyncRecordID = latestSyncRecord?.id;
    // Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
    } else {
      let newSyncRecord = await SyncTrackRepository.create({
        latest_block_synced: 0,
        contract_address: tokenAddress,
        meta: "erc721-sync",
        network_name: network,
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

      console.log(`Archiving ERC-721 transfer events of ${tokenAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

      let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

      let tokenTransferEventFilter = {
        topics : [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          null,
          null,
        ]
      };

      const ERC721Contract = new Contract(tokenAddress, ERC721ABI);
      const erc721Contract = await ERC721Contract.connect(provider);

      await Promise.all([
        eventIndexer(erc721Contract, ERC721ABI, tokenTransferEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
      ]).then(async ([
        transferEvents,
      ]) => {
        console.log(`${network} had ${transferEvents ? transferEvents.length : 0} Transfer events for token address ${tokenAddress}`);
        
        // clear all existing transfer events for this token
        let deletedRecords = await TokenTransferEventERC721Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
        console.log({deletedRecords});

        // get all transactions associated with transfers
        let transactions = [];
        let transactionHashToTimestamp : {[key: string]: string} = {};
        if(transferEvents) {
          let transactionHashes = transferEvents.map(transferEvent => transferEvent.transactionHash);
          let uniqueTransactionHashes = Array.from(new Set(transactionHashes));
          transactions = await transactionInfoIndexer(uniqueTransactionHashes, network, "ERC-721 Event Txs");
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
        
        // insert transfers
        if(transferEvents) {
          for(let transferEvent of transferEvents) {
            await TokenTransferEventERC721Repository.create({
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
              token_id: transferEvent.args.tokenId.toString(),
              transaction_hash: transferEvent.transactionHash,
              log_index: transferEvent.logIndex,
            })
          }

          let sortedTransferEvents = [...transferEvents].sort((a, b) => {

            let resultBlockNumber = 
              new BigNumber(a.blockNumber).isEqualTo(new BigNumber(b.blockNumber)) 
                ? 0 
                : new BigNumber(a.blockNumber).isGreaterThan(new BigNumber(b.blockNumber))
                  ? 1
                  : -1;
    
            let resultTransactionIndex = 
              new BigNumber(a.transactionIndex).isEqualTo(new BigNumber(b.transactionIndex)) 
                ? 0 
                : new BigNumber(a.transactionIndex).isGreaterThan(new BigNumber(b.transactionIndex))
                  ? 1
                  : -1;
    
            let resultLogIndex = 
              new BigNumber(a.logIndex).isEqualTo(new BigNumber(b.logIndex)) 
                ? 0 
                : new BigNumber(a.logIndex).isGreaterThan(new BigNumber(b.logIndex))
                  ? 1
                  : -1;
    
            return resultBlockNumber || resultTransactionIndex || resultLogIndex;

          })
    
          for(let event of sortedTransferEvents) {
            let { from, to, tokenId } = event.args;

            let timestamp = transactionHashToTimestamp[event.transactionHash];

            tokenId = tokenId.toString();
    
            if(from === '0x0000000000000000000000000000000000000000') {
              // is a minting event, has no existing holder to reduce value on, increase value of `to`
              // event Transfer
              // increase value of `to`
              // increaseNonFungibleTokenHolderBalance method creates record if there isn't an existing balance to modify
              await BalanceRepository.increaseNonFungibleTokenHolderBalance(to, tokenAddress, tokenId, network, timestamp, true);
            } else {
              // is a transfer from an existing holder to another address, reduce value of `from`, increase value of `to`
              // event TransferSingle
              // decrease value of `from`
              await BalanceRepository.decreaseNonFungibleTokenHolderBalance(from, tokenAddress, tokenId, network, timestamp);
              // increase value of `to`
              await BalanceRepository.increaseNonFungibleTokenHolderBalance(to, tokenAddress, tokenId, network, timestamp);
            }
          }
        }

        // Update Sync Track Record
        if(latestSyncRecordID) {
          await SyncTrackRepository.update({latest_block_synced: latestBlockNumber}, latestSyncRecordID);
        }

        console.log(`Completed ERC-721 transfer event sync of ${tokenAddress} on ${network} (${blockRange} blocks synced)`);

      })

    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false}, latestSyncRecordID);
    }

  } else {
    console.log(`Already busy with syncing ERC-721 transfer events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}