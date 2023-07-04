import { EVM_TRANSACTION_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class EVMTransactionModel extends BaseModel {
    static get tableName() {
      return EVM_TRANSACTION_TABLE
    }

    static get idColumn() {
      return "id"
    }
}