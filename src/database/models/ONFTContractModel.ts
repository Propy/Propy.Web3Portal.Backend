import { ONFT_CONTRACT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class ONFTContractModel extends BaseModel {
  static get tableName() {
    return ONFT_CONTRACT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}