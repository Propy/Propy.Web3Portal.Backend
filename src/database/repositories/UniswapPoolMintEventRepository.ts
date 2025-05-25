import { UniswapPoolMintEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class UniswapPoolMintEventRepository extends BaseRepository {
  getModel() {
    return UniswapPoolMintEventModel
  }

  async clearRecordsByPoolAddressAboveOrEqualToBlockNumber(poolAddress: string, blockNumber: number) {
    return await this.model.query().where(function (this: QueryBuilder<UniswapPoolMintEventModel>) {
      this.where("pool_address", poolAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }

  async findEventByEventFingerprint(eventFingerprint: string) {

    const result = await this.model.query().where(function (this: QueryBuilder<UniswapPoolMintEventModel>) {
      this.where("event_fingerprint", eventFingerprint);
    })

    if (result.length === 0) {
      return null;
    }

    return this.parserResult(result);
    
  }

  async findEventByPositionNftAddressAndTokenId(positionNftAddress: string, tokenId: string) {

    const result = await this.model.query().where(function (this: QueryBuilder<UniswapPoolMintEventModel>) {
      this.where("position_nft_address", positionNftAddress);
      this.where("token_id", tokenId);
    })

    if (result.length === 0) {
      return null;
    }

    return this.parserResult(result);
    
  }
}

export default new UniswapPoolMintEventRepository()