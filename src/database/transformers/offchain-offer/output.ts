import BaseTransformer from '../BaseTransformer';

import AssetOutputReducedTransformer from '../asset/output-reduced';

import { IOffchainOfferRecord } from "../../../interfaces";

class OffchainOfferOutputOnAssetTransformer extends BaseTransformer {
  transform(offchainOfferEntry: IOffchainOfferRecord) {
    return {
      user_address: offchainOfferEntry.user_address,
      asset_address: offchainOfferEntry.asset_address,
      token_id: offchainOfferEntry.token_id,
      offer_token_address: offchainOfferEntry.offer_token_address,
      offer_token_amount: offchainOfferEntry.offer_token_amount,
      timestamp_unix: offchainOfferEntry.timestamp_unix,
      ...(offchainOfferEntry.offer_token && { offer_token: AssetOutputReducedTransformer.transform(offchainOfferEntry.offer_token) })
    }
  }
}

export default new OffchainOfferOutputOnAssetTransformer();