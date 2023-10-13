import { SystemReportModel } from "../models";
import BaseRepository from "./BaseRepository";

class SystemReportRepository extends BaseRepository {
  getModel() {
    return SystemReportModel
  }
}

export default new SystemReportRepository()