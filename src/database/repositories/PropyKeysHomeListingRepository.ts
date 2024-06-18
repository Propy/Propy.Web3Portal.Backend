import { QueryBuilder } from "objection";

import { PropyKeysHomeListingModel } from "../models";
import BaseRepository from "./BaseRepository";
import { ITransformer } from "../../interfaces";

class PropyKeysHomeListingRepository extends BaseRepository {
  getModel() {
    return PropyKeysHomeListingModel
  }

  async getListingByTokenIdAndAddressAndNetwork(
    tokenId: string,
    assetAddress: string,
    network: string,
    transformer?: ITransformer,
  ) {
    const result = await this.model.query()
    .where(function (this: QueryBuilder<PropyKeysHomeListingModel>) {
      this.where('token_id', tokenId);
      this.where('asset_address', assetAddress);
      this.where('network_name', network);
    }).first();

    return this.parserResult(result, transformer);
  }
}

export default new PropyKeysHomeListingRepository()