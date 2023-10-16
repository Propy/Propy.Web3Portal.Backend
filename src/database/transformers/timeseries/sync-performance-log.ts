import BaseTransformer from '../BaseTransformer';

import { ISyncPerformanceLog } from "../../../interfaces";

class SyncPerformanceLogTimeseriesTransformer extends BaseTransformer {
  transform(performanceLogEntry: ISyncPerformanceLog) {
    return {
      date: Math.floor(new Date(performanceLogEntry.created_at).getTime() / 1000),
      value: performanceLogEntry.sync_duration_seconds,
    }
  }
}

export default new SyncPerformanceLogTimeseriesTransformer();