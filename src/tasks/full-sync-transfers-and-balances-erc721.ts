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
  debugMode,
  NETWORK_TO_MAX_BLOCK_RANGE,
} from '../constants';

import {
	TokenTransferEventERC721Repository,
  SyncTrackRepository,
  BalanceRepository,
  EVMTransactionRepository,
  UniswapPoolMintEventRepository,
} from "../database/repositories";

import {
  IAssetRecordDB,
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

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTransfersAndBalancesERC721 = async (
	tokenERC721: IAssetRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    address: tokenAddress,
    deployment_block: deploymentBlock,
    uniswap_lp_asset: uniswapLpAsset,
  } = tokenERC721;

  let latestSyncRecord = await SyncTrackRepository.getSyncTrack(tokenAddress, network, 'erc721-sync');

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
        contract_address: tokenAddress,
        meta: "erc721-sync",
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

        createLog(`Archiving ERC-721 transfer events of ${tokenAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

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
          eventIndexer(erc721Contract, ERC721ABI, tokenTransferEventFilter, latestBlockNumberWithinRangeLimit, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} Transfer events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
        ]).then(async ([
          transferEvents,
        ]) => {
          createLog(`${network} had ${transferEvents ? transferEvents.length : 0} Transfer events for token address ${tokenAddress}`);

          let uniswapLpTransferEvents = [];
          if(uniswapLpAsset && transferEvents) {
            for(let transferEvent of transferEvents) {
              console.log({transferEvent, 'transferEvent.args': transferEvent.args})
              let tokenIdDetected = await UniswapPoolMintEventRepository.findEventByPositionNftAddressAndTokenId(tokenAddress, transferEvent.args.tokenId.toString());
              if(tokenIdDetected) {
                uniswapLpTransferEvents.push(transferEvent);
              }
            }
            transferEvents = uniswapLpTransferEvents;
            createLog(`UNISWAP LP SYNC, ${network} had ${transferEvents ? transferEvents.length : 0} Transfer events for token address ${tokenAddress} ON RELEVANT UNISWAP LP TXS`);
          }
          
          // clear all existing transfer events for this token
          let deletedRecords = await TokenTransferEventERC721Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
          createLog({deletedRecords});

          // get all transactions associated with transfers
          let transactions = [];
          let transactionHashToTimestamp : {[key: string]: string} = {};
          if(transferEvents) {
            let transactionHashes = [];
            for(let transferEvent of transferEvents) {
              transactionHashes.push(transferEvent.transactionHash);
            }
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
              let eventFingerprint = getEventFingerprint(network, transferEvent.blockNumber, transferEvent.transactionIndex, transferEvent.logIndex);
              let existingTokenTransferEventRecord = await TokenTransferEventERC721Repository.findEventByEventFingerprint(eventFingerprint);
              if(!existingTokenTransferEventRecord) {
                try {
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
                    event_fingerprint: eventFingerprint,
                  })
                } catch (e) {
                  createErrorLog("Unable to create ERC-721 transfer event", e);
                }
              }
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

            // hide individual balance change logs if there are more than 100 transfers being processed (for performance reasons), unless debugMode is on
            let hideBalanceChangeLogs = sortedTransferEvents.length > 100 && !debugMode;
            if(hideBalanceChangeLogs) {
              createLog(`Hiding individual balance change logs for ${sortedTransferEvents.length} transfer events`);
            }
      
            for(let event of sortedTransferEvents) {
              let { from, to, tokenId } = event.args;

              let timestamp = transactionHashToTimestamp[event.transactionHash];

              tokenId = tokenId.toString();
      
              if(from === '0x0000000000000000000000000000000000000000') {
                // is a minting event, has no existing holder to reduce value on, increase value of `to`
                // event Transfer
                // increase value of `to`
                // increaseNonFungibleTokenHolderBalance method creates record if there isn't an existing balance to modify
                await BalanceRepository.increaseNonFungibleTokenHolderBalance(to, tokenAddress, tokenId, network, timestamp, true, hideBalanceChangeLogs);
              } else {
                // is a transfer from an existing holder to another address, reduce value of `from`, increase value of `to`
                // event TransferSingle
                // decrease value of `from`
                await BalanceRepository.decreaseNonFungibleTokenHolderBalance(from, tokenAddress, tokenId, network, timestamp, hideBalanceChangeLogs);
                // increase value of `to`
                await BalanceRepository.increaseNonFungibleTokenHolderBalance(to, tokenAddress, tokenId, network, timestamp, false, hideBalanceChangeLogs);
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

          createLog(`Completed ERC-721 transfer event sync of ${tokenAddress} on ${network} (${blockRange} blocks synced)`);

        })

      }

    } else {
      createLog(`Skipping sync of ${tokenAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumberWithinRangeLimit})`);
    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false, progress_started_timestamp: null}, latestSyncRecordID);
    }

  } else {
    createLog(`Already busy with syncing ERC-721 transfer events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}