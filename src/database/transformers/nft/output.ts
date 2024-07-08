import BaseTransformer from '../BaseTransformer';

import AssetOutputReducedTransformer from '../asset/output-reduced';
import BalanceOutputOnAssetTransformer from '../balance/output-reduced';
import OffchainOfferOutputOnAssetTransformer from '../offchain-offer/output';
import PropyKeysHomeListingOutputTransformer from '../listing/propykeys-listing-output';

import { INFTRecord } from "../../../interfaces";

class NftOutputTransformer extends BaseTransformer {
  transform(nftEntry: INFTRecord) {
    console.log({'nftEntry.propykeys_home_listing': nftEntry.propykeys_home_listing})
    return {
      network_name: nftEntry.network_name,
      asset_address: nftEntry.asset_address,
      token_id: nftEntry.token_id,
      metadata: nftEntry.metadata,
      ...(nftEntry.longitude && { token_uri: nftEntry.longitude }),
      ...(nftEntry.latitude && { token_uri: nftEntry.latitude }),
      ...(nftEntry.token_uri && { token_uri: nftEntry.token_uri }),
      ...(nftEntry.asset && { asset: AssetOutputReducedTransformer.transform(nftEntry.asset) }),
      ...(nftEntry.balances && { balances: nftEntry.balances.map(balance => BalanceOutputOnAssetTransformer.transform(balance)) }),
      ...(nftEntry.transfer_events_erc721 && { transfer_events_erc721: nftEntry.transfer_events_erc721 }),
      ...(nftEntry.offchain_offers && { offchain_offers: nftEntry.offchain_offers.map(offchain_offer => OffchainOfferOutputOnAssetTransformer.transform(offchain_offer)) }),
      ...(nftEntry.propykeys_home_listing && {propykeys_home_listing: PropyKeysHomeListingOutputTransformer.transform(nftEntry.propykeys_home_listing)})
    }
  }
}

export default new NftOutputTransformer();