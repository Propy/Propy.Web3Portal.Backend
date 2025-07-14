import { ONFT_RECEIVED_EVENT_TABLE, EVM_TRANSACTION_TABLE } from "../tables";
import BaseModel from "./BaseModel";
import EVMTransactionModel from './EVMTransactionModel';

export default class ONFTReceivedEventModel extends BaseModel {
  static get tableName() {
    return ONFT_RECEIVED_EVENT_TABLE
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
            from: `${ONFT_RECEIVED_EVENT_TABLE}.transaction_hash`,
            to: `${EVM_TRANSACTION_TABLE}.hash`,
        }
      }
    }
  }
}