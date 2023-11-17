import BaseTransformer from '../BaseTransformer';

import { IOffchainOfferRecord } from "../../../interfaces";

class OffchainOfferOutputOnAssetTransformer extends BaseTransformer {
  transform(offchainOfferEntry: IOffchainOfferRecord) {
    return {
      user_address: offchainOfferEntry.user_address,
      asset_address: offchainOfferEntry.asset_address,
      token_id: offchainOfferEntry.token_id,
      offer_token_address: offchainOfferEntry.offer_token_address,
      offer_token_amount: offchainOfferEntry.offer_token_amount,
    }
  }
}

export default new OffchainOfferOutputOnAssetTransformer();