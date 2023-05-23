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
} from "../database/repositories";

import ERC20ABI from '../web3/abis/ERC20ABI.json';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const fullSyncTransfersAndBalancesERC20 = async (
	network: string,
	tokenAddress: string,
  postgresTimestamp?: number,
) => {

  let latestBlockNumber = await getLatestBlockNumber(network);

	// let latestSyncRecord = await SyncTrackRepository.getSyncTrack(address, network, 'erc20-sync');
  // let latestSyncRecord;
	// let startBlock = latestSyncRecord?.latest_block_synced ? latestSyncRecord?.latest_block_synced : "0";

  let startBlock = "0";

  let erc20TokenAddresses = [""]; // todo PRO token address
  
  console.log(`Archiving transactions of ${tokenAddress} on ${network}`);

  // For each ERC-20 address, get the entire transaction history associated with the account

  let currentTokenProgress = 1;
  let earliestBlock;

  let provider = getNetworkProvider(network);

  if(provider) {

    let eventIndexBlockTrackerRecord = {
      event_name: "transferFrom",
      last_checked_block: 0,
      genesis_block: Number(earliestBlock),
      meta: "transferFrom"
    }

    let {
      fromBlock,
      toBlock,
      blockRange,
    } = extractFromBlockToBlock(latestBlockNumber, eventIndexBlockTrackerRecord);

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
      let deletedRecords = await TokenTransferEventERC20Repository.clearRecordsByContractAddress(tokenAddress);
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

    })

  }

}