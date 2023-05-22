import {
  AssetRepository,
} from '../database/repositories';

import {
	fetchCoingeckoAssetInfo,
} from './fetch-coingecko-asset-info';

import {
  networkToCoingeckoId
} from '../constants';

export const patchMissingCoingeckoIds = async () => {

  // Fetch all assets with positive prices but missing coingecko ids
  let assetsMissingCoingeckoIds = await AssetRepository.getPositivePriceAssetsMissingCoingeckoIds();

  for(let asset of assetsMissingCoingeckoIds) {
    // Get coingecko ID for asset
    // TODO: add a positive price but token not found flag and add a condition to this function to skip positive price records which can't be found on coingecko
    let coingeckoAssetInfo = await fetchCoingeckoAssetInfo(networkToCoingeckoId[asset.network_name], asset.address);
    if(coingeckoAssetInfo?.id) {
      // Save coingecko ID
      await AssetRepository.update({
        coingecko_id: coingeckoAssetInfo?.id,
      }, asset.id);
    }
  }

}