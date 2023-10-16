// Internal Interfaces Below

import {
  IPagination
} from '../utils/Pagination';

export interface ITransformer {
  transform: (arg0: any) => any;
  constructor: any;
}

export interface IEtherscanTxERC20 {
  blockNumber: string
  timeStamp: string
  hash: string
  nonce: string
  blockHash: string
  from: string
  contractAddress: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  transactionIndex: string
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  input: string
  confirmations: string
}

export interface IToken {
  address: string
  name: string
  symbol: string
  decimal: string
  network: string
  standard: "ERC-20" | "ERC-721" | "ERC-1155"
}

export interface IBalanceEntry {
  tokenInfo: IToken
  latestBlock: string
  earliestBlock: string
  balance: string
}

export interface INetworkToBalanceEntry {
  [key: string]: IBalanceRecord[]
}

export interface INetworkToNFTEntry {
  [key: string]: INFTRecord[]
}

export interface INetworkToBalancesERC20 {
  network: "ethereum" | "optimism" | "arbitrum"
  balances: IBalanceEntry,
}

export interface ITokenAddressToLastPrice {
  [key: string]: ICoingeckoAssetPriceEntry
}

export interface ICoingeckoAssetPriceEntryResponse {
  [key: string]: ICoingeckoAssetPriceEntry
}

export interface ICoingeckoAssetPriceEntry {
  usd: string
  usd_market_cap: string
  usd_24h_vol: string
  usd_24h_change: string
}

export interface ICoingeckoAssetInfo {
  "id": string
  "symbol": string
  "name": string
  "asset_platform_id": string
  "platforms": {[key: string]: string}
}

export interface INetwork {
  id: number
  name: string
}

export interface IAccountAssetValueEntry {
  balance: string,
  value: string;
  symbol: string;
  percentage_of_total: string;
  market_cap_usd?: string,
  volume_24hr_usd?: string,
  change_24hr_usd_percent?: string,
  token_price: string;
  token_decimals: string;
  coingecko_id: false | string;
}

export interface IBalanceRecord {
  network_name: string,
  asset_address: string,
  holder_address: string,
  token_id: string,
  balance: string,
  nft?: INFTRecord,
}

export interface INFTRecord {
  network_name: string,
  asset_address: string,
  token_id: string,
  metadata: string,
  balances?: IBalanceRecord[],
  asset?: IAssetRecordDB,
  transfer_events_erc721?: ITransferEventERC721Record[];
}

export interface IEVMTransactionRecord {
  network_name: string;
  hash: string;
  block_hash: string;
  block_number: string;
  block_timestamp: string;
  from: string;
  to: string;
  gas: string;
  input: string;
  nonce: string;
  r: string;
  s: string;
  v: string;
  transaction_index: string;
  type: string;
  value: string;
}

export interface ITransferEventERC721Record {
  network: string;
  block_number: string;
  block_hash: string;
  transaction_index: string;
  removed: boolean;
  contract_address: string;
  data: string;
  topic: string;
  from: string;
  to: string;
  token_id: string;
  transaction_hash: string;
  log_index: number;
  evm_transaction?: IEVMTransactionRecord;
}

export interface ITransferEventERC20Record {
  network: string;
  block_number: string;
  block_hash: string;
  transaction_index: string;
  removed: boolean;
  contract_address: string;
  data: string;
  topic: string;
  from: string;
  to: string;
  transaction_hash: string;
  log_index: number;
  evm_transaction?: IEVMTransactionRecord;
}

export interface IAssetRecordDB {
  id: number;
  address: string;
  network_name: string;
  symbol: string;
  standard: string;
  decimals: string;
  created_at: string;
  updated_at: string;
  deployment_block: string;
  name: string;
  collection_name: string;
  slug: string;
  last_price_usd: string;
  is_base_asset: boolean,
  market_cap_usd: string;
  volume_24hr_usd: string;
  change_24hr_usd_percent: string;
  coingecko_id: null | string;
  balances?: IBalanceRecord[];
  transfer_events_erc721?: ITransferEventERC721Record[];
  transfer_events_erc20?: ITransferEventERC20Record[];
  transfer_event_erc20_count?: number;
}

export interface ISyncPerformanceLog {
  id: number;
  name: string;
  sync_duration_seconds: number;
  created_at: string;
}

export interface ITimeseries {
  value: string | number;
  timestamp: string;
}

export interface IAddressToMultichainBaseBalance {
	[key: string]: {[key: string]: string}
}

export interface ITokenAddressList {
	[key: string]: string[]
}

export interface IAddressToNetworkToLatestBlock {
	[key: string]: {
		[key: string]: string
	}
}

export interface IAddressToMultichainBalances {
	[key: string]: {
		[key: string]: {
			[key: string]: IBalanceEntry
		}
	}
}

export interface IOwnedBalancesResult {
  [key: string]: {
    [key: string]: {
      balances?: IBalanceEntry[],
      asset: IAssetRecordDB,
      balancesPagination?: IPagination
    },
  }
}

export interface IMixedBalancesResult {
  [key: string]: {
		[key: string]: {
			balances?: IBalanceEntry[],
      asset: IAssetRecordDB,
      balancesPagination?: IPagination
		},
	}
}