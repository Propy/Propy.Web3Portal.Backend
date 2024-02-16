import { STAKING_CONTRACT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class StakingContractModel extends BaseModel {
  static get tableName() {
    return STAKING_CONTRACT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}