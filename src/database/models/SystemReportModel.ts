import { SYSTEM_REPORT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class SystemReportModel extends BaseModel {
  static get tableName() {
    return SYSTEM_REPORT_TABLE
  }

  static get idColumn() {
    return "id"
  }
}