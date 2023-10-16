import { SyncPerformanceLogModel } from "../models";
import BaseRepository from "./BaseRepository";

import SyncPerformanceLogTimeseriesTransformer from '../transformers/timeseries/sync-performance-log';

class SyncPerformanceLogRepository extends BaseRepository {
  getModel() {
    return SyncPerformanceLogModel
  }

  async getTimeseries(metricName: string) {

    let results = await this.findByColumn('name', metricName, true);

    return this.parserResult(results, SyncPerformanceLogTimeseriesTransformer);
    
  }
}

export default new SyncPerformanceLogRepository()