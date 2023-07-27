import { QueryBuilder } from "objection";

import { ITransformer } from "../../interfaces";
import { NFTModel } from "../models";
import BaseRepository from "./BaseRepository";

class NFTRepository extends BaseRepository {
  getModel() {
    return NFTModel
  }

  async getNftByAddressAndNetworkAndTokenId(
    assetAddress: string,
    network: string,
    tokenId: string,
    transformer?: ITransformer,
  ) {
    const result = await this.model.query()
      .withGraphJoined('asset')
      .withGraphJoined('balances')
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('nft.asset_address', assetAddress);
        this.where('nft.network_name', network);
        this.where('nft.token_id', tokenId);
      }).first();

    return this.parserResult(result, transformer);
  }

  async getRecordsMissingMetadataByStandard(tokenStandard: string) {
    const results = await this.model.query()
    .withGraphJoined('asset')
    .where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset.standard', tokenStandard);
      this.where('metadata', null);
    });

    return this.parserResult(results);
  }

  async updateMetadataByNetworkStandardTokenAddressAndTokenId(metadata: string, networkName: string, assetAddress: string, tokenId: string) {
    await this.model.query().update({ metadata }).where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset_address', assetAddress);
      this.where('token_id', tokenId);
      this.where('network_name', networkName);
    });
  }
}

export default new NFTRepository()