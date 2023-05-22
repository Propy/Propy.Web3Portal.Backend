import { NetworkModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class NetworkRepository extends BaseRepository {
  getModel() {
    return NetworkModel
  }

  async getNetworks() {

    const results = await this.model.query();
    
    return this.parserResult(results)
  }
}

export default new NetworkRepository()
