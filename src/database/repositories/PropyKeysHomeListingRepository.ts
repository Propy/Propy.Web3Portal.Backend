import { QueryBuilder } from "objection";

import { PropyKeysHomeListingModel, NFTModel } from "../models";
import BaseRepository from "./BaseRepository";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

import { ITransformer, IArbitraryQueryFilters, IArbitraryQuerySorter } from "../../interfaces";

class PropyKeysHomeListingRepository extends BaseRepository {
  getModel() {
    return PropyKeysHomeListingModel
  }

  async getPropyKeysHomeListingById(
    id: string,
    transformer?: ITransformer,
  ) {
    const result = await this.model.query()
    .where(function (this: QueryBuilder<PropyKeysHomeListingModel>) {
      this.where('id', id);
    }).first();

    return this.parserResult(result, transformer);
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

  async getCollectionPaginated(
    contractNameOrCollectionNameOrAddress: string,
    pagination: IPaginationRequest,
    listingDirectFilters?: IArbitraryQueryFilters[],
    nftMetadataFilters?: IArbitraryQueryFilters[],
    sortLogic?: IArbitraryQuerySorter,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    let query = this.model.query()
      .withGraphJoined('likes')
      .where(function (this: QueryBuilder<PropyKeysHomeListingModel>) {
        this.where('collection_name', contractNameOrCollectionNameOrAddress);
        this.orWhere(`${PropyKeysHomeListingModel.tableName}.asset_address`, contractNameOrCollectionNameOrAddress);
      })
      .joinRaw(`INNER JOIN ${NFTModel.tableName} ON ${PropyKeysHomeListingModel.tableName}.asset_address = ${NFTModel.tableName}.asset_address AND ${NFTModel.tableName}.token_id = ${PropyKeysHomeListingModel.tableName}.token_id`)
      .where(function (this: QueryBuilder<PropyKeysHomeListingModel>) {
        if (nftMetadataFilters && nftMetadataFilters.length > 0) {
          for (let additionalFilter of nftMetadataFilters) {
            if (additionalFilter.metadata_filter) {
              const metadataFilter = {
                attributes: [
                  {
                    trait_type: additionalFilter['filter_type'],
                    value: additionalFilter['value']
                  }
                ]
              };
              console.log({metadataFilter, 'metadataFilter.attributes': metadataFilter.attributes})
              this.whereJsonSupersetOf(`nft.metadata`, metadataFilter);
            }
          }
        }
      });

      if (listingDirectFilters && listingDirectFilters?.length > 0) {
        query = query.where(function (this: QueryBuilder<PropyKeysHomeListingModel>) {
          let listingDirectFiltersUsed = 0;
          for (let listingFilter of listingDirectFilters) {
            if (listingDirectFiltersUsed === 0) {
              this.where(listingFilter.filter_type, listingFilter.operator ? listingFilter.operator : "=", listingFilter.value);
            } else {
              this.andWhere(listingFilter.filter_type, listingFilter.operator ? listingFilter.operator : "=", listingFilter.value);
            }
            listingDirectFiltersUsed++;
          }
        });
      }

      if(sortLogic) {
        if(sortLogic.sort_by === "likes") {
          query = query.orderByRaw(`COALESCE(likes.count, 0) ${sortLogic.sort_direction}, likes.count ${sortLogic.sort_direction} NULLS LAST, created_at DESC`)
        }
        if(sortLogic.sort_by === "most_liked") {
          query = query.orderByRaw(`COALESCE(likes.count, 0) DESC, likes.count DESC NULLS LAST, created_at DESC`)
        }
        if(sortLogic.sort_by === "latest") {
          query = query.orderBy('created_at', 'DESC')
        }
      } else {
        query = query.orderBy('created_at', 'DESC')
      }

      const results = await query.page(page - 1, perPage)

      return this.parserResult(new Pagination(results, perPage, page), transformer);
  }
}

export default new PropyKeysHomeListingRepository()