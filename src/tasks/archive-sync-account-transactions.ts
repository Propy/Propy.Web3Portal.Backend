import BigNumber from 'bignumber.js';

import { utils } from 'ethers';

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

import ERC20ABI from '../web3/abis/ERC20ABI.json';

import {
	createLog
} from '../logger';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const runArchiveSyncAccountTransactions = async (
	network: string,
	address: string,
  postgresTimestamp: number,
) => {

  let latestBlockNumber = await getLatestBlockNumber(network);

	// let latestSyncRecord = await SyncTrackRepository.getSyncTrack(address, network, 'erc20-sync');
  // let latestSyncRecord;
	// let startBlock = latestSyncRecord?.latest_block_synced ? latestSyncRecord?.latest_block_synced : "0";

  let startBlock = "0";

  let erc20TokenAddresses = [""]; // todo PRO token address
  
  createLog(`Archiving transactions of ${erc20TokenAddresses.length} token addresses on ${network} for ${address}`);

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
        utils.hexZeroPad(address, 32)
      ]
    };

    let sendTokenEventFilter = {
      topics : [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        utils.hexZeroPad(address, 32),
        null,
      ]
    }

    await Promise.all([
      eventIndexer(null, ERC20ABI, receiveTokenEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `NO CONTRACT ADDRESS Transfer Receives (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`),
      eventIndexer(null, ERC20ABI, sendTokenEventFilter, latestBlockNumber, fromBlock, toBlock, blockRange, maxBlockBatchSize, network, `NO CONTRACT ADDRESS Transfer Sends (network: ${network}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, blockRange: ${blockRange}, maxBlockBatchSize: ${maxBlockBatchSize})`)
    ]).then(([
      receiveEvents,
      sendEvents
    ]) => {
      createLog(`${network} had ${receiveEvents ? receiveEvents.length : 0} receive events and ${sendEvents ? sendEvents.length : 0} send events for address ${address}`);
    })

  }

}