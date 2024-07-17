import BaseTransformer from '../BaseTransformer';

import { IBaseWithdrawalInitiatedEvent } from "../../../interfaces";

class BaseWithdrawalInitiatedEventOutputTransformer extends BaseTransformer {
  transform(withdrawalInitiatedEvent: IBaseWithdrawalInitiatedEvent) {
    if(withdrawalInitiatedEvent) {
      return {
        network_name: withdrawalInitiatedEvent.network_name,
        block_number: withdrawalInitiatedEvent.block_number,
        block_hash: withdrawalInitiatedEvent.block_hash,
        contract_address: withdrawalInitiatedEvent.contract_address,
        l1_token_address: withdrawalInitiatedEvent.l1_token_address,
        l2_token_address: withdrawalInitiatedEvent.l2_token_address,
        from: withdrawalInitiatedEvent.from,
        to: withdrawalInitiatedEvent.to,
        amount: withdrawalInitiatedEvent.amount,
        transaction_hash: withdrawalInitiatedEvent.transaction_hash,
        withdrawal_hash: withdrawalInitiatedEvent.withdrawal_hash,
        type: 'withdrawal',
        ...(withdrawalInitiatedEvent.evm_transaction && {timestamp: withdrawalInitiatedEvent.evm_transaction.block_timestamp}),
        withdrawal_proven_event: withdrawalInitiatedEvent.withdrawal_proven_event ? withdrawalInitiatedEvent.withdrawal_proven_event : null,
        withdrawal_finalized_event: withdrawalInitiatedEvent.withdrawal_finalized_event ? withdrawalInitiatedEvent.withdrawal_finalized_event : null,
      }
    } else {
      return false;
    }
  }
}

export default new BaseWithdrawalInitiatedEventOutputTransformer();