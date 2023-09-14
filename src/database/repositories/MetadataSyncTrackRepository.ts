import { MetadataSyncTrackModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class MetadataSyncTrackRepository extends BaseRepository {
  getModel() {
    return MetadataSyncTrackModel
  }

  async getSyncTrack(name: string) {

    const results = await this.model.query()
      .where(function (this: QueryBuilder<MetadataSyncTrackModel>) {
        this.where('name', name);
      }).first();

    return this.parserResult(results);

  }
}

export default new MetadataSyncTrackRepository()