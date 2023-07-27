import BaseTransformer from '../BaseTransformer';

import BalanceOutputOnAssetTransformer from '../balance/output-reduced';

import { IAssetRecordDB } from "../../../interfaces";

class AssetOutputTransformer extends BaseTransformer {
  transform(assetEntry: IAssetRecordDB) {
    return {
      address: assetEntry.address,
      network_name: assetEntry.network_name,
      symbol: assetEntry.symbol,
      standard: assetEntry.standard,
      decimals: assetEntry.decimals,
      name: assetEntry.name,
      last_price_usd: assetEntry.last_price_usd,
      is_base_asset: assetEntry.is_base_asset,
      market_cap_usd: assetEntry.market_cap_usd,
      volume_24hr_usd: assetEntry.volume_24hr_usd,
      change_24hr_usd_percent: assetEntry.change_24hr_usd_percent,
      coingecko_id: assetEntry.coingecko_id,
      ...(assetEntry.balances && {balances: assetEntry.balances.map(balance => BalanceOutputOnAssetTransformer.transform(balance)) }),
      ...(assetEntry.transfer_events_erc721 && {transfer_events_erc721: assetEntry.transfer_events_erc721}),
      // todo pagination instead of attaching erc20 events to asset records
      ...(assetEntry.transfer_events_erc20 && {transfer_events_erc20: assetEntry.transfer_events_erc20.sort((a, b) => {
        return Number(b.evm_transaction?.block_timestamp) - Number(a.evm_transaction?.block_timestamp)
      }).slice(0, 12)}),
      ...(assetEntry.transfer_events_erc20 && {transfer_event_erc20_count: assetEntry.transfer_events_erc20.length}),
    }
  }
}

export default new AssetOutputTransformer();