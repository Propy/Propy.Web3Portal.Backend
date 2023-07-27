import BaseTransformer from '../BaseTransformer';

import AssetOutputReducedTransformer from '../asset/output-reduced';
import BalanceOutputOnAssetTransformer from '../balance/output-reduced';

import { INFTRecord } from "../../../interfaces";

class NftOutputTransformer extends BaseTransformer {
  transform(nftEntry: INFTRecord) {
    return {
      network_name: nftEntry.network_name,
      asset_address: nftEntry.asset_address,
      token_id: nftEntry.token_id,
      metadata: nftEntry.metadata,
      ...(nftEntry.asset && { asset: AssetOutputReducedTransformer.transform(nftEntry.asset) }),
      ...(nftEntry.balances && { balances: nftEntry.balances.map(balance => BalanceOutputOnAssetTransformer.transform(balance)) }),
      ...(nftEntry.transfer_events_erc721 && { transfer_events_erc721: nftEntry.transfer_events_erc721 }),
    }
  }
}

export default new NftOutputTransformer();