// General utils
import { getLatestBlockNumberRetryOnFailure } from './getLatestBlockNumber';
import { getBlocks } from './getBlocks';
import { getBalanceOfERC20 } from './getBalanceOfERC20';
import { getTokenInfoERC20 } from './getTokenInfoERC20';
import { getTokenURIOfERC721 } from './getTokenURIOfERC721';

// Event
import { eventIndexer } from './eventIndexer';

// Transaction
import { transactionInfoIndexer, transactionInfoAndEventsIndexer } from './transactionInfoIndexer';
import { transactionReceiptIndexer } from './transactionReceiptIndexer';

// Gas Fees
import { getFeeHistory } from './getFeeHistory';
import { getMaxPriorityFeePerGas } from './getMaxPriorityFeePerGas';

export {
  // general utils
  getLatestBlockNumberRetryOnFailure,
  getBlocks,
  getBalanceOfERC20,
  getTokenInfoERC20,
  getTokenURIOfERC721,
  // events
  eventIndexer,
  // transactions
  transactionInfoIndexer,
  transactionInfoAndEventsIndexer,
  transactionReceiptIndexer,
  // gas fees
  getFeeHistory,
  getMaxPriorityFeePerGas,
}