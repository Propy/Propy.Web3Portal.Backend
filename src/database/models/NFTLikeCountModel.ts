import { NFT_LIKE_COUNT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class NFTLikeCountModel extends BaseModel {
  static get tableName() {
    return NFT_LIKE_COUNT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}