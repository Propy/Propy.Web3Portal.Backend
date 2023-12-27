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
      }
    }
    return null;
  }
}

export default new NftCoordinateOutputTransformer();