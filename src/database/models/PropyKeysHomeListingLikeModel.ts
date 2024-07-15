import { PROPYKEYS_LISTING_LIKE_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class PropyKeysHomeListingLikeModel extends BaseModel {
  static get tableName() {
    return PROPYKEYS_LISTING_LIKE_TABLE
  }

  static get idColumn() {
    return "id"
  }
}