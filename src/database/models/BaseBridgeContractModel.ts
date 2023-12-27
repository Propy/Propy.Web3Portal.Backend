import { BASE_BRIDGE_CONTRACT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class BaseBridgeContractModel extends BaseModel {
  static get tableName() {
    return BASE_BRIDGE_CONTRACT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}