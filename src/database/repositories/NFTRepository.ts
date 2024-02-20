import { QueryBuilder, raw } from "objection";

import { ITransformer, IArbitraryQueryFilters, INFTRecord } from "../../interfaces";
import { NFTModel } from "../models";
import BaseRepository from "./BaseRepository";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

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
      .withGraphJoined('offchain_offers')
      .withGraphJoined('offchain_offers.offer_token')
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('nft.asset_address', assetAddress);
        this.where('nft.network_name', network);
        this.where('nft.token_id', tokenId);
      }).first();

    return this.parserResult(result, transformer);
  }

  async getMinimalNftByAddressAndNetworkAndTokenId(
    assetAddress: string,
    network: string,
    tokenId: string,
    transformer?: ITransformer,
  ) {
    const result = await this.model.query()
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('nft.asset_address', assetAddress);
        this.where('nft.network_name', network);
        this.where('nft.token_id', tokenId);
      }).first();

    return this.parserResult(result, transformer);
  }

  async getRecentlyMintedPaginated(
    pagination: IPaginationRequest,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const results = await this.model.query()
      .withGraphJoined('asset')
      .withGraphJoined('balances')
      .orderBy('mint_timestamp', 'DESC')
      .page(page - 1, perPage)

      return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async getCollectionPaginated(
    contractNameOrCollectionNameOrAddress: string,
    pagination: IPaginationRequest,
    additionalFilters?: IArbitraryQueryFilters[],
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    let query = this.model.query()
      .withGraphJoined('asset')
      .withGraphJoined('balances')
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('asset.name', contractNameOrCollectionNameOrAddress);
        this.orWhere('asset.collection_name', contractNameOrCollectionNameOrAddress);
        this.orWhere('asset.address', contractNameOrCollectionNameOrAddress);
        this.orWhere('asset.slug', contractNameOrCollectionNameOrAddress);
      })
      .where(function (this: QueryBuilder<NFTModel>) {
        if(additionalFilters && additionalFilters?.length > 0 && additionalFilters.some((entry) => !entry.existence_check && entry.metadata_filter)) {
          let additionalFiltersUsed = 0;
          for(let additionalFilter of additionalFilters) {
            if(!additionalFilter.existence_check && additionalFilter.metadata_filter) {
              let queryValue = `metadata @> '{"attributes": [{"trait_type": "${additionalFilter['filter_type']}", "value": "${additionalFilter['value']}"}]}'`;
              if(additionalFilter.existence_check) {
                queryValue = `metadata @> '{"attributes": [{"trait_type": "${additionalFilter['filter_type']}", "value": "${additionalFilter['value']}"}]}'`;
              }
              if(additionalFiltersUsed === 0) {
                this.whereRaw(queryValue);
              } else {
                this.andWhereRaw(queryValue);
              }
              additionalFiltersUsed++;
            }
          }
        }
      })

      if(additionalFilters && additionalFilters?.length > 0 && additionalFilters.some((entry) => !entry.metadata_filter)) {
        query = query.where(function (this: QueryBuilder<NFTModel>) {
          let additionalFiltersUsed = 0;
          for(let additionalFilter of additionalFilters) {
            if(!additionalFilter.metadata_filter) {
              if(additionalFiltersUsed === 0) {
                this.where(additionalFilter.filter_type, additionalFilter.value);
              } else {
                this.andWhere(additionalFilter.filter_type, additionalFilter.value);
              }
              additionalFiltersUsed++;
            }
          }
        })
      }

      if(additionalFilters && additionalFilters?.length > 0 && additionalFilters.some((entry) => entry.existence_check && entry.metadata_filter)) {
        query = query.whereExists(function(this: QueryBuilder<NFTModel>) {
          for(let additionalFilter of additionalFilters) {
            if(additionalFilter.existence_check && additionalFilter.metadata_filter) {
              let additionalExclusionQuery = '';
              if(additionalFilter.exclude_values) {
                for(let excludeValue of additionalFilter.exclude_values) {
                  additionalExclusionQuery += ` AND (elem ->> 'value') != '${excludeValue}'`
                }
              }
              this.select(1)
                .from(raw('jsonb_array_elements(metadata -> \'attributes\') as elem'))
                .whereRaw(`elem ->> 'trait_type' = '${additionalFilter.filter_type}'`)
                .andWhereRaw(`(elem ->> 'value') IS NOT NULL AND (elem ->> 'value') != ''${additionalExclusionQuery}`);
            }
          }
        })
      }

      const results = await query.orderBy('mint_timestamp', 'DESC').page(page - 1, perPage)

      return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async getCoordinatesPaginated(
    contractNameOrCollectionNameOrAddress: string,
    pagination: IPaginationRequest,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const results = await this.model.query()
      .withGraphJoined('asset')
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('asset_address', contractNameOrCollectionNameOrAddress);
        this.whereNotNull('longitude')
        this.whereNotNull('latitude')
      })
      .orderBy('mint_timestamp', 'DESC')
      .page(page - 1, perPage)

      return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async getRecordsMissingMetadataByStandard(tokenStandard: string) {
    const results = await this.model.query()
    .withGraphJoined('asset')
    .where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset.standard', tokenStandard);
      this.where('metadata', null).orWhere('metadata', false);
    });

    return this.parserResult(results);
  }

  async updateMetadataByNetworkStandardTokenAddressAndTokenId(metadata: string, tokenURI: string, networkName: string, assetAddress: string, tokenId: string) {
    await this.model.query().update({ 
      metadata,
      ...(tokenURI && { token_uri: tokenURI }),
    }).where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset_address', assetAddress);
      this.where('token_id', tokenId);
      this.where('network_name', networkName);
    });
  }

  async getUniqueMetadataFieldValues(
    assetAddress: string,
    network: string,
    metadataField: string,
    transformer?: ITransformer,
  ) {

    let metadataFieldName = metadataField.toLowerCase().replace(" ", "_");

    const result = await this.model.query()
    .select(this.model.raw(`DISTINCT attribute->>'value' AS ${metadataFieldName}`))
    .from(this.model.raw("??, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(metadata->'attributes') = 'array' THEN metadata->'attributes' ELSE '[]'::jsonb END) AS attribute", [this.model.tableName]))
    .whereRaw(`attribute->>'trait_type' = '${metadataField}'`)
    .andWhereRaw("attribute->>'value' IS NOT NULL")
    .andWhere('nft.asset_address', assetAddress)
    .andWhere('nft.network_name', network);

    let resultsArray = result.map((value: {[key: string]: string}) => value[metadataFieldName]);

    return this.parserResult(resultsArray, transformer);
  }

  async clearRecordsByAssetAddress(assetAddress: string) {
    return await this.model.query().where(function (this: QueryBuilder<NFTModel>) {
      this.where("asset_address", assetAddress);
    }).delete();
  }

  async updateLongitudeAndLatitude(longitude: string, latitude: string, networkName: string, assetAddress: string, tokenId: string) {
    await this.model.query().update({ 
      longitude,
      latitude,
    }).where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset_address', assetAddress);
      this.where('token_id', tokenId);
      this.where('network_name', networkName);
    });
  }

}

export default new NFTRepository()