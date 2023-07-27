import BaseTransformer from '../BaseTransformer';

import BalanceOutputOnAssetTransformer from '../balance/output-reduced';

import { IAssetRecordDB } from "../../../interfaces";

class AssetOutputReducedTransformer extends BaseTransformer {
  transform(assetEntry: IAssetRecordDB) {
    return {
      address: assetEntry.address,
      network_name: assetEntry.network_name,
      symbol: assetEntry.symbol,
      standard: assetEntry.standard,
      decimals: assetEntry.decimals,
      name: assetEntry.name,
      is_base_asset: assetEntry.is_base_asset,
    }
  }
}

export default new AssetOutputReducedTransformer();