import BaseTransformer from '../BaseTransformer';

import { IBalanceRecord } from "../../../interfaces";

class BalanceOutputOnAssetTransformer extends BaseTransformer {
  transform(balanceEntry: IBalanceRecord) {
    return {
      holder_address: balanceEntry.holder_address,
      token_id: balanceEntry.token_id,
      balance: balanceEntry.balance,
    }
  }
}

export default new BalanceOutputOnAssetTransformer();