import { NFTLikeModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class NFTLikeRepository extends BaseRepository {
  getModel() {
    return NFTLikeModel
  }

  async getLike(
    contractAddress: string,
    tokenId: string,
    network: string,
    likerAddress: string,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<NFTLikeModel>) {
        this.where('contract_address', contractAddress);
        this.where('token_id', tokenId);
        this.where('network_name', network);
        this.where('liker_address', likerAddress);
      })
      .first();

    return this.parserResult(result);
  }

  async getLikesPaginated(
    contractAddress: string,
    tokenId: string,
    network: string,
    pagination: IPaginationRequest,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const results = await this.model.query()
      .where(function (this: QueryBuilder<NFTLikeModel>) {
        this.where('contract_address', contractAddress);
        this.where('token_id', tokenId);
        this.where('network_name', network);
      })
      .page(page - 1, perPage);

    return this.parserResult(new Pagination(results, perPage, page));

  }
}

export default new NFTLikeRepository()