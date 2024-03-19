import { GENERIC_CACHE_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class GenericCacheModel extends BaseModel {
    static get tableName() {
      return GENERIC_CACHE_TABLE
    }

    static get idColumn() {
      return "id"
    }
}