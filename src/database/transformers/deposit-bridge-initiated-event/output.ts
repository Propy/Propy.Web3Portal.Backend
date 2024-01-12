import BaseTransformer from '../BaseTransformer';

import { IBaseDepositBridgeInitiatedEvent } from "../../../interfaces";

class BaseDepositBridgeInitiatedEventOutputTransformer extends BaseTransformer {
  transform(depositBridgeInitiatedEvent: IBaseDepositBridgeInitiatedEvent) {
    return {
      network_name: depositBridgeInitiatedEvent.network_name,
      block_number: depositBridgeInitiatedEvent.block_number,
      block_hash: depositBridgeInitiatedEvent.block_hash,
      contract_address: depositBridgeInitiatedEvent.contract_address,
      l1_token_address: depositBridgeInitiatedEvent.l1_token_address,
      l2_token_address: depositBridgeInitiatedEvent.l2_token_address,
      from: depositBridgeInitiatedEvent.from,
      to: depositBridgeInitiatedEvent.to,
      amount: depositBridgeInitiatedEvent.amount,
      transaction_hash: depositBridgeInitiatedEvent.transaction_hash,
      type: 'deposit',
      ...(depositBridgeInitiatedEvent.evm_transaction && {timestamp: depositBridgeInitiatedEvent.evm_transaction.block_timestamp}),
    }
  }
}

export default new BaseDepositBridgeInitiatedEventOutputTransformer();