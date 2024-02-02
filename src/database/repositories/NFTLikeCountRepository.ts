import { NFTLikeCountModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class NFTLikeCountRepository extends BaseRepository {
  getModel() {
    return NFTLikeCountModel
  }

  async getLikeCount(
    contractAddress: string,
    tokenId: string,
    network: string,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<NFTLikeCountModel>) {
        this.where('contract_address', contractAddress);
        this.where('token_id', tokenId);
        this.where('network_name', network);
      })
      .first();

    return this.parserResult(result);
  }

}

export default new NFTLikeCountRepository();