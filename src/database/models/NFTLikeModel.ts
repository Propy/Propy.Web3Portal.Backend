import { NFT_LIKE_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class NFTLikeModel extends BaseModel {
  static get tableName() {
    return NFT_LIKE_TABLE
  }

  static get idColumn() {
    return "id"
  }
}