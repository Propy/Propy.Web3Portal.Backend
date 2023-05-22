import { AssetModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

class AssetRepository extends BaseRepository {
    getModel() {
      return AssetModel
    }

    async getAssetByAddress(assetAddress: string) {
      const result = await this.model.query().where(function (this: QueryBuilder<AssetModel>) {
        this.where('address', assetAddress);
      }).first();

      return this.parserResult(result);
    }

    async getAssetByAddressAndNetwork(
      assetAddress: string,
      network: string,
      transformer?: ITransformer,
    ) {
      const result = await this.model.query().where(function (this: QueryBuilder<AssetModel>) {
        this.where('address', assetAddress);
        this.where('network_name', network);
      }).first();

      return this.parserResult(result, transformer);
    }

    async getBaseAssetByNetwork(networkName: string) {
      const result = await this.model.query().where(function (this: QueryBuilder<AssetModel>) {
        this.where('network_name', networkName);
        this.where('is_base_asset', true);
      })

      return this.parserResult(result);
    }

    async getNonBaseAssetByNetwork(networkName: string) {
      const result = await this.model.query().where(function (this: QueryBuilder<AssetModel>) {
        this.where('network_name', networkName);
        this.where('is_base_asset', false);
      })

      return this.parserResult(result);
    }

    async getAssets(pagination: IPaginationRequest) {

      const { perPage, page } = pagination;

      const results = await this.model.query().page(page - 1, perPage);
      
      return this.parserResult(new Pagination(results, perPage, page))
    }

    async getPositivePriceAssetsMissingCoingeckoIds() {
      const result = await this.model.query().where(function (this: QueryBuilder<AssetModel>) {
        this.where('last_price_usd', '>', 0);
        this.where('coingecko_id', null);
      })

      return this.parserResult(result);
    }

    async updateLastPriceOfAsset(assetAddress: string, lastPrice: string) {
      await this.model.query().update({last_price_usd: lastPrice}).where("address", assetAddress);
    }

    async update24HrVolumeOfAsset(assetAddress: string, volume: string) {
      await this.model.query().update({volume_24hr_usd: volume}).where("address", assetAddress);
    }

    async updateMarketCapOfAsset(assetAddress: string, marketCap: string) {
      await this.model.query().update({market_cap_usd: marketCap}).where("address", assetAddress);
    }

    async update24HrChangePercentOfAsset(assetAddress: string, changePercent: string) {
      await this.model.query().update({change_24hr_usd_percent: changePercent}).where("address", assetAddress);
    }
}

export default new AssetRepository()
