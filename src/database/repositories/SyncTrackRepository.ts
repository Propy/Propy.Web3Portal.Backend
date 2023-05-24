import { SyncTrackModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class SyncTrackRepository extends BaseRepository {
  getModel() {
    return SyncTrackModel
  }

  async getSyncTrack(contractAddress: string, network: string, meta: string) {

    const results = await this.model.query()
      .where(function (this: QueryBuilder<SyncTrackModel>) {
        this.where('contract_address', contractAddress);
        this.where('network', network);
        this.where('meta', meta);
      }).first();

    return this.parserResult(results);

  }
}

export default new SyncTrackRepository()