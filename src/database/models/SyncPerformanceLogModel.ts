import { SYNC_PERFORMANCE_LOG_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class SyncPerformanceLogModel extends BaseModel {
    static get tableName() {
      return SYNC_PERFORMANCE_LOG_TABLE
    }

    static get idColumn() {
      return "id"
    }
}