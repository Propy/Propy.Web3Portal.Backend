import { BASE_DEPOSIT_BRIDGE_INITIATED_EVENT_TABLE, EVM_TRANSACTION_TABLE } from "../tables";
import EVMTransactionModel from './EVMTransactionModel';
import BaseModel from "./BaseModel";

export default class BaseDepositBridgeInitiatedEventModel extends BaseModel {
  static get tableName() {
    return BASE_DEPOSIT_BRIDGE_INITIATED_EVENT_TABLE
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
            from: `${BASE_DEPOSIT_BRIDGE_INITIATED_EVENT_TABLE}.transaction_hash`,
            to: `${EVM_TRANSACTION_TABLE}.hash`,
        }
      }
    }
  }
}