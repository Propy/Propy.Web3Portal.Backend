import { NFTStakingStatusModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class NFTStakingStatusRepository extends BaseRepository {
  getModel() {
    return NFTStakingStatusModel
  }

  async getStatusRecord(contractAddress: string, tokenId: string, network: string) {

    const results = await this.model.query()
      .where(function (this: QueryBuilder<NFTStakingStatusModel>) {
        this.where('contract_address', contractAddress);
        this.where('token_id', tokenId);
        this.where('network_name', network);
      }).first();

    return this.parserResult(results);

  }
}

export default new NFTStakingStatusRepository()