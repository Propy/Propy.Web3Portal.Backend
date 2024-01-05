import BaseTransformer from '../BaseTransformer';

import AssetOutputReducedTransformer from '../asset/output-reduced';
import BalanceOutputOnAssetTransformer from '../balance/output-reduced';
import OffchainOfferOutputOnAssetTransformer from '../offchain-offer/output';

import { INFTRecord } from "../../../interfaces";

class NftCoordinateOutputTransformer extends BaseTransformer {
  transform(nftEntry: INFTRecord) {
    if(nftEntry && nftEntry.longitude && nftEntry.latitude) {
      return {
        ...(nftEntry.longitude && { longitude: nftEntry.longitude }),
        ...(nftEntry.latitude && { latitude: nftEntry.latitude }),
        ...(nftEntry.asset_address && { asset_address: nftEntry.asset_address }),
        ...(nftEntry.token_id && { token_id: nftEntry.token_id }),
        ...(nftEntry?.asset?.network_name && { network_name: nftEntry.asset.network_name }),
      }
    }
    return null;
  }
}

export default new NftCoordinateOutputTransformer();