import { SyncPerformanceLogModel } from "../models";
import BaseRepository from "./BaseRepository";

import SyncPerformanceLogTimeseriesTransformer from '../transformers/timeseries/sync-performance-log';

class SyncPerformanceLogRepository extends BaseRepository {
  getModel() {
    return SyncPerformanceLogModel
  }

  async getTimeseries(metricName: string) {

    let resultRaw = await this.model.query().where('name', metricName).orderBy('id', 'asc');
    let results = resultRaw.length === 0 ? [] : this.parserResult(resultRaw);

    return this.parserResult(results, SyncPerformanceLogTimeseriesTransformer);
    
  }
}

export default new SyncPerformanceLogRepository()