import { NETWORK_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class NetworkModel extends BaseModel {
    static get tableName() {
      return NETWORK_TABLE
    }

    static get idColumn() {
      return "id"
    }
}