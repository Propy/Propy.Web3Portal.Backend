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
} from '../constants';

import {
	TokenUriUpdateEventERC721Repository,
  SyncTrackRepository,
  EVMTransactionRepository,
  NFTRepository,
} from "../database/repositories";

import {
  IAssetRecordDB,
  INFTRecord,
} from '../interfaces';

import ERC721ABI from '../web3/abis/ERC721ABI.json';

import {
	syncTokenMetadata
} from './sync-token-metadata';

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

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTokenURIUpdatesERC721 = async (
	tokenERC721: IAssetRecordDB,
  postgresTimestamp?: number,
) => {

  let {
    network_name: network,
    address: tokenAddress,
    deployment_block: deploymentBlock,
  } = tokenERC721;

  let latestSyncRecord = await SyncTrackRepository.getSyncTrack(tokenAddress, network, 'erc721-tokenuri-update-sync');

  if(!latestSyncRecord?.id || !latestSyncRecord.in_progress) {

    let latestSyncRecordID = latestSyncRecord?.id;
    // Create/Update Sync Track Record, set to "in progress" to avoid duplicated syncs
    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: true}, latestSyncRecordID);
    } else {
      let newSyncRecord = await SyncTrackRepository.create({
        latest_block_synced: 0,
        contract_address: tokenAddress,
        meta: "erc721-tokenuri-update-sync",
        network_name: network,
        in_progress: true,
      });
      latestSyncRecordID = newSyncRecord.id;
    }

    let latestBlockNumber = await getLatestBlockNumberRetryOnFailure(network);
    let startBlock = latestSyncRecord?.latest_block_synced && (Number(latestSyncRecord?.latest_block_synced) > 0) ? Number(latestSyncRecord?.latest_block_synced) + 1 : Number(deploymentBlock);

    if(Number(latestBlockNumber) > Number(startBlock)) {

      let earliestBlock;

      let provider = getNetworkProvider(network);

      if(provider) {

        let eventIndexBlockTrackerRecord = {
          event_name: "TokenURIUpdated",
          from_block: Number(startBlock),
          genesis_block: Number(earliestBlock),
          meta: "TokenURIUpdated"
        }

        let {
          fromBlock,
          toBlock,
          blockRange,
        } = extractFromBlockToBlock(latestBlockNumber, eventIndexBlockTrackerRecord);

        createLog(`Archiving ERC-721 TokenURIUpdated events of ${tokenAddress} on ${network}, syncing from block ${startBlock} (${blockRange} blocks to sync)`);

        let maxBlockBatchSize = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] ? NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS[network] : 25000;

        let tokenTokenUriUpdatedEventFilter = {
          topics : [
            // event TokenURIUpdated(uint256 indexed tokenId, DeedHashedStates.TokenState indexed tokenState, string indexed tokenURI);
            '0x8a208fd94ff799982cd9337b16e3df3bacafd412f2cd70bbf42896a70b807b6d',
            null,
            null,
            null,
          ]
        };

        const ERC721Contract = new Contract(tokenAddress, ERC721ABI);
        const erc721Contract = await ERC721Contract.connect(provider);

        await Promise.all([
          eventIndexer(erc721Contract, ERC721ABI, tokenTokenUriUpdatedEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `${tokenAddress} TokenURIUpdated events (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
        ]).then(async ([
          tokenUriUpdatedEvents,
        ]) => {
          createLog(`${network} had ${tokenUriUpdatedEvents ? tokenUriUpdatedEvents.length : 0} TokenURIUpdated events for token address ${tokenAddress}`);
          
          // clear all existing TokenURIUpdate events for this token
          let deletedRecords = await TokenUriUpdateEventERC721Repository.clearRecordsByContractAddressAboveOrEqualToBlockNumber(tokenAddress, startBlock);
          createLog({deletedRecords});

          // get all transactions associated with TokenURIUpdate events
          let transactions = [];
          let transactionHashToTimestamp : {[key: string]: string} = {};
          if(tokenUriUpdatedEvents) {
            let transactionHashes = tokenUriUpdatedEvents.map(tokenUriUpdatedEvent => tokenUriUpdatedEvent.transactionHash);
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
          
          let tokenIdsForMetadataRefresh : string[] = [];

          // insert TokenURIUpdate events
          if(tokenUriUpdatedEvents) {
            for(let tokenUriUpdatedEvent of tokenUriUpdatedEvents) {
              let eventFingerprint = getEventFingerprint(network, tokenUriUpdatedEvent.blockNumber, tokenUriUpdatedEvent.transactionIndex, tokenUriUpdatedEvent.logIndex);
              let existingTokenTransferEventRecord = await TokenUriUpdateEventERC721Repository.findEventByEventFingerprint(eventFingerprint);
              if(tokenUriUpdatedEvent?.args?.tokenId && (tokenIdsForMetadataRefresh.indexOf(tokenUriUpdatedEvent.args.tokenId) === -1)) {
                // Flag token ID for refresh
                tokenIdsForMetadataRefresh.push(tokenUriUpdatedEvent.args.tokenId.toString());
              }
              if(!existingTokenTransferEventRecord) {
                try {
                  await TokenUriUpdateEventERC721Repository.create({
                    network_name: network,
                    block_number: tokenUriUpdatedEvent.blockNumber,
                    block_hash: tokenUriUpdatedEvent.blockHash,
                    transaction_index: tokenUriUpdatedEvent.transactionIndex,
                    removed: tokenUriUpdatedEvent.removed,
                    contract_address: tokenUriUpdatedEvent.address,
                    data: tokenUriUpdatedEvent.data,
                    topic: JSON.stringify(tokenUriUpdatedEvent.topics),
                    token_id: tokenUriUpdatedEvent.args.tokenId.toString(),
                    token_state: tokenUriUpdatedEvent.args.tokenState.toString(),
                    token_uri: tokenUriUpdatedEvent.args.tokenURI,
                    transaction_hash: tokenUriUpdatedEvent.transactionHash,
                    log_index: tokenUriUpdatedEvent.logIndex,
                    event_fingerprint: eventFingerprint,
                  })
                } catch (e) {
                  createErrorLog("Unable to create ERC-721 TokenURIUpdate event", e);
                }
              }
            }

            let nftRecordsForMetadataRefresh : INFTRecord[] = []
            for(let tokenId of tokenIdsForMetadataRefresh) {
              let nftRecord = await NFTRepository.getMinimalNftByAddressAndNetworkAndTokenId(tokenAddress, network, tokenId);
              if(nftRecord) {
                nftRecordsForMetadataRefresh.push(nftRecord);
              }
            }

            if(nftRecordsForMetadataRefresh && nftRecordsForMetadataRefresh.length > 0) {
              createLog(`Refreshing ${nftRecordsForMetadataRefresh.length} metadata records`);
              await syncTokenMetadata(nftRecordsForMetadataRefresh, "ERC-721");
            } else {
              createLog(`No metadata records to refresh`);
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

          createLog(`Completed ERC-721 TokenURIUpdated event sync of ${tokenAddress} on ${network} (${blockRange} blocks synced)`);

        })

      }

    } else {
      createLog(`Skipping sync of ${tokenAddress} on ${network}, since block range is too small to warrant a sync (startBlock: ${startBlock}, latestBlock: ${latestBlockNumber})`);
    }

    if(latestSyncRecordID) {
      await SyncTrackRepository.update({in_progress: false}, latestSyncRecordID);
    }

  } else {
    createLog(`Already busy with syncing ERC-721 TokenURIUpdated events of ${tokenAddress} on ${network}, skipping this additional run`);
  }

}