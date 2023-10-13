import { ERC721_TOKEN_URI_UPDATE_EVENT_TABLE, EVM_TRANSACTION_TABLE } from "../tables";
import EVMTransactionModel from './EVMTransactionModel';
import BaseModel from "./BaseModel";

export default class TokenUriUpdateEventERC721Model extends BaseModel {
  static get tableName() {
    return ERC721_TOKEN_URI_UPDATE_EVENT_TABLE
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
            from: `${ERC721_TOKEN_URI_UPDATE_EVENT_TABLE}.transaction_hash`,
            to: `${EVM_TRANSACTION_TABLE}.hash`,
        }
      }
    }
  }
}