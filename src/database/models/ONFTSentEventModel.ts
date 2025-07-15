import { EVM_TRANSACTION_TABLE, ONFT_SENT_EVENT_TABLE } from "../tables";
import BaseModel from "./BaseModel";
import EVMTransactionModel from './EVMTransactionModel';

export default class ONFTSentEventModel extends BaseModel {
  static get tableName() {
    return ONFT_SENT_EVENT_TABLE
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
            from: `${ONFT_SENT_EVENT_TABLE}.transaction_hash`,
            to: `${EVM_TRANSACTION_TABLE}.hash`,
        }
      }
    }
  }
}