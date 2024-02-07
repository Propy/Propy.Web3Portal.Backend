import { NFT_STAKING_STATUS_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class NFTStakingStatusModel extends BaseModel {
  static get tableName() {
    return NFT_STAKING_STATUS_TABLE
  }

  static get idColumn() {
    return "id"
  }
}