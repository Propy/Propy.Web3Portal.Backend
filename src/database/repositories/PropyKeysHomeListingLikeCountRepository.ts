import { PropyKeysHomeListingLikeCountModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";

class PropyKeysHomeListingLikeCountRepository extends BaseRepository {
  getModel() {
    return PropyKeysHomeListingLikeCountModel
  }

  async getLikeCount(
    propyKeysListingId: string,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<PropyKeysHomeListingLikeCountModel>) {
        this.where('propykeys_listing_id', propyKeysListingId);
      })
      .first();

    return this.parserResult(result);
  }

}

export default new PropyKeysHomeListingLikeCountRepository();