import { ERC20_TRANSFER_EVENT_TABLE, EVM_TRANSACTION_TABLE } from "../tables";
import EVMTransactionModel from './EVMTransactionModel';
import BaseModel from "./BaseModel";

export default class TokenTransferEventERC20Model extends BaseModel {
    static get tableName() {
      return ERC20_TRANSFER_EVENT_TABLE
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
              from: `${ERC20_TRANSFER_EVENT_TABLE}.transaction_hash`,
              to: `${EVM_TRANSACTION_TABLE}.hash`,
          }
        }
      }
    }
}