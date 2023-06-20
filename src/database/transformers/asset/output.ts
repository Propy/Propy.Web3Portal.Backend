import BaseTransformer from '../BaseTransformer';

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
      ...(assetEntry.balance && {balance_record: assetEntry.balance}),
    }
  }
}

export default new AssetOutputTransformer();