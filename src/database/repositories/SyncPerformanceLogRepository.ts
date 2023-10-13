import { SyncPerformanceLogModel } from "../models";
import BaseRepository from "./BaseRepository";

class SyncPerformanceLogRepository extends BaseRepository {
  getModel() {
    return SyncPerformanceLogModel
  }
}

export default new SyncPerformanceLogRepository()