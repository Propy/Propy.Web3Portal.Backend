import { BaseBridgeContractModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

class AssetRepository extends BaseRepository {
    getModel() {
      return BaseBridgeContractModel
    }

    async getContractByAddress(assetAddress: string) {
      const result = await this.model.query().where(function (this: QueryBuilder<BaseBridgeContractModel>) {
        this.where('address', assetAddress);
      });

      return this.parserResult(result);
    }

    async getContractByAddressAndNetwork(
      assetAddress: string,
      network: string,
      transformer?: ITransformer,
    ) {
      const result = await this.model.query()
      .where(function (this: QueryBuilder<BaseBridgeContractModel>) {
        this.where('address', assetAddress);
        this.where('network_name', network);
      }).first();

      return this.parserResult(result, transformer);
    }

    async getContractByAddressAndNetworkAndMeta(
      assetAddress: string,
      network: string,
      meta: string,
      transformer?: ITransformer,
    ) {
      const result = await this.model.query()
      .where(function (this: QueryBuilder<BaseBridgeContractModel>) {
        this.where('address', assetAddress);
        this.where('network_name', network);
        this.where('meta', network);
      }).first();

      return this.parserResult(result, transformer);
    }

    async getContractByMeta(
      assetAddress: string,
      network: string,
      meta: string,
      transformer?: ITransformer,
    ) {
      const result = await this.model.query()
      .where(function (this: QueryBuilder<BaseBridgeContractModel>) {
        this.where('address', assetAddress);
        this.where('network_name', network);
        this.where('meta', network);
      })

      return this.parserResult(result, transformer);
    }

    async getSyncContracts(transformer?: ITransformer) {
      const result = await this.model.query()
      .where(function (this: QueryBuilder<BaseBridgeContractModel>) {
        this.where('enable_sync', true);
      })

      return this.parserResult(result, transformer);
    }
}

export default new AssetRepository()
