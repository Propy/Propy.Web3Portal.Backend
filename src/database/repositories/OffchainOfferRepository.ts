import { QueryBuilder } from "objection";
import { ITransformer } from "../../interfaces";
import { OffchainOfferModel } from "../models";
import BaseRepository from "./BaseRepository";

class OffchainOfferRepository extends BaseRepository {
  getModel() {
    return OffchainOfferModel
  }

  async getOffchainOfferByUserAddressAndAssetAddressAndTokenId(
    userAddress: string,
    assetAddress: string,
    tokenId: string,
    transformer?: ITransformer,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<OffchainOfferModel>) {
        this.where('user_address', userAddress);
        this.where('asset_address', assetAddress);
        this.where('token_id', tokenId);
      }).first();

    return this.parserResult(result, transformer);
  }
}

export default new OffchainOfferRepository()