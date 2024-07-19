import { PropyKeysHomeListingLikeModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";

class PropyKeysHomeListingLikeRepository extends BaseRepository {
  getModel() {
    return PropyKeysHomeListingLikeModel
  }

  async getLike(
    propyKeysListingId: string,
    likerAddress: string,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<PropyKeysHomeListingLikeModel>) {
        this.where('propykeys_listing_id', propyKeysListingId);
        this.where('liker_address', likerAddress);
      })
      .first();

    return this.parserResult(result);
  }
}

export default new PropyKeysHomeListingLikeRepository()