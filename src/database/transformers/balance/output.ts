import BaseTransformer from '../BaseTransformer';

import { IBalanceRecord } from "../../../interfaces";

class BalanceOutputTransformer extends BaseTransformer {
  transform(balanceEntry: IBalanceRecord) {
    return {
      network_name: balanceEntry.network_name,
      asset_address: balanceEntry.asset_address,
      holder_address: balanceEntry.holder_address,
      token_id: balanceEntry.token_id,
      balance: balanceEntry.balance,
      ...(balanceEntry.nft && {nft: balanceEntry?.nft}),
    }
  }
}

export default new BalanceOutputTransformer();