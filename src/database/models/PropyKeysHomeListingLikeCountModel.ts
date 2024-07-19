import { PROPYKEYS_LISTING_LIKE_COUNT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class PropyKeysHomeListingLikeCountModel extends BaseModel {
  static get tableName() {
    return PROPYKEYS_LISTING_LIKE_COUNT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}