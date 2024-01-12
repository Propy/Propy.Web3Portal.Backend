import { 
  BASE_WITHDRAWAL_INITIATED_EVENT_TABLE,
  BASE_WITHDRAWAL_PROVEN_EVENT_TABLE,
  BASE_WITHDRAWAL_FINALIZED_EVENT_TABLE,
  EVM_TRANSACTION_TABLE,
} from "../tables";
import EVMTransactionModel from './EVMTransactionModel';
import BaseWithdrawalProvenEventModel from './BaseWithdrawalProvenEventModel';
import BaseWithdrawalFinalizedEventModel from './BaseWithdrawalFinalizedEventModel';
import BaseModel from "./BaseModel";

export default class BaseWithdrawalInitiatedEventModel extends BaseModel {
  static get tableName() {
    return BASE_WITHDRAWAL_INITIATED_EVENT_TABLE
  }

  static get idColumn() {
    return "id"
  }

  static get relationMappings() {
    return {
      evm_transaction: {
        relation: BaseModel.HasOneRelation,
        modelClass: EVMTransactionModel,
        join: {
            from: `${BASE_WITHDRAWAL_INITIATED_EVENT_TABLE}.transaction_hash`,
            to: `${EVM_TRANSACTION_TABLE}.hash`,
        }
      },
      // TODO might need to review this in case of there being an invalid proof, might lead to a scenario with multiple proofs
      // Temporarily assuming that a submitted proof corresponds to a valid proof
      withdrawal_proven_event: {
        relation: BaseModel.HasOneRelation,
        modelClass: BaseWithdrawalProvenEventModel,
        join: {
            from: `${BASE_WITHDRAWAL_INITIATED_EVENT_TABLE}.withdrawal_hash`,
            to: `${BASE_WITHDRAWAL_PROVEN_EVENT_TABLE}.withdrawal_hash`,
        }
      },
      withdrawal_finalized_event: {
        relation: BaseModel.HasOneRelation,
        modelClass: BaseWithdrawalFinalizedEventModel,
        join: {
            from: `${BASE_WITHDRAWAL_INITIATED_EVENT_TABLE}.withdrawal_hash`,
            to: `${BASE_WITHDRAWAL_FINALIZED_EVENT_TABLE}.withdrawal_hash`,
        }
      }
    }
  }
}