import { PROPYKEYS_HOME_LISTING_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class PropyKeysHomeListingModel extends BaseModel {
    static get tableName() {
      return PROPYKEYS_HOME_LISTING_TABLE
    }

    static get idColumn() {
      return "id"
    }
}