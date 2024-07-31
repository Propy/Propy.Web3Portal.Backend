import { QueryBuilder, raw } from "objection";

import { ITransformer, IArbitraryQueryFilters, INFTRecord, IArbitraryQuerySorter } from "../../interfaces";
import { NFTModel, NFTStakingStatusModel, PropyKeysHomeListingModel } from "../models";
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
      .withGraphJoined('propykeys_home_listing')
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
    sortLogic?: IArbitraryQuerySorter,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    let query = this.model.query()
      .withGraphJoined('asset')
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

      const needsBalancesJoin = additionalFilters?.some(filter => 
        filter.filter_type === 'balances.holder_address' || 
        (filter.filter_type && filter.filter_type.startsWith('balances.'))
      );
      if (needsBalancesJoin) {
        query = query.withGraphJoined('balances');
      }

      const needsLikesJoin = sortLogic && sortLogic.sort_by && (["likes", "most_liked"].indexOf(sortLogic.sort_by) > -1);
      if (needsLikesJoin) {
        query = query.withGraphJoined('likes');
      }

      if (additionalFilters && additionalFilters?.length > 0 && additionalFilters.some((entry) => !entry.metadata_filter)) {
        query = query.where(function (this: QueryBuilder<NFTModel>) {
          let additionalFiltersUsed = 0;
          for (let additionalFilter of additionalFilters) {
            if (!additionalFilter.metadata_filter) {
              if (additionalFilter.filter_type === 'balances.holder_address') {
                if (additionalFiltersUsed === 0) {
                  this.where('balances.holder_address', additionalFilter.value);
                  this.orWhereExists(function (this: QueryBuilder<NFTModel>) {
                    this.select('*')
                      .from(NFTStakingStatusModel.tableName)
                      .whereRaw('?? = ??', ['contract_address', 'asset.address'])
                      .whereRaw('?? = ??', ['token_id', 'balances.token_id'])
                      .where('last_staking_address', additionalFilter.value)
                      .where('staking_status', true);
                  });
                } else {
                  this.andWhere('balances.holder_address', additionalFilter.value);
                  this.orWhereExists(function (this: QueryBuilder<NFTModel>) {
                    this.select('*')
                      .from(NFTStakingStatusModel.tableName)
                      .whereRaw('?? = ??', ['contract_address', 'asset.address'])
                      .whereRaw('?? = ??', ['token_id', 'balances.token_id'])
                      .where('last_staking_address', additionalFilter.value)
                      .where('staking_status', true);
                  });
                }
              } else {
                if (additionalFiltersUsed === 0) {
                  this.where(additionalFilter.filter_type, additionalFilter.value);
                } else {
                  this.andWhere(additionalFilter.filter_type, additionalFilter.value);
                }
              }
              additionalFiltersUsed++;
            }
          }
        });
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

      if(sortLogic) {
        if(sortLogic.sort_by === "likes") {
          query = query.orderByRaw(`COALESCE(likes.count, 0) ${sortLogic.sort_direction}, likes.count ${sortLogic.sort_direction} NULLS LAST, mint_timestamp DESC`)
        }
        if(sortLogic.sort_by === "most_liked") {
          query = query.orderByRaw(`COALESCE(likes.count, 0) DESC, likes.count DESC NULLS LAST, mint_timestamp DESC`)
        }
        if(sortLogic.sort_by === "latest") {
          query = query.orderBy('mint_timestamp', 'DESC')
        }
      } else {
        query = query.orderBy('mint_timestamp', 'DESC');
      }

      const results = await query.page(page - 1, perPage);

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

  async getCoordinates(
    contractNameOrCollectionNameOrAddress: string,
    transformer?: ITransformer,
  ) {

    const results = await this.model.query()
      .withGraphJoined('asset')
      .where(function (this: QueryBuilder<NFTModel>) {
        this.where('asset_address', contractNameOrCollectionNameOrAddress);
        this.whereNotNull('longitude')
        this.whereNotNull('latitude')
      })
      .orderBy('mint_timestamp', 'DESC')
      .limit(20000)

      return this.parserResult(results, transformer);
  }

  async getCoordinatesPostGISClusters(
    contractNameOrCollectionNameOrAddress: string,
    transformer?: ITransformer,
  ) {
    const results = await this.model.query()
      .select(
        this.model.raw('ST_AsText(ST_Centroid(ST_Collect(geom))) AS cluster_center'),
        this.model.raw('COUNT(*) AS point_count')
      )
      .from(
        this.model.query()
          .select(
            this.model.raw('ST_SetSRID(ST_MakePoint(ST_X(longitude_postgis), ST_Y(latitude_postgis)), 4326) AS geom'),
            this.model.raw('ST_ClusterKMeans(ST_SetSRID(ST_MakePoint(ST_X(longitude_postgis), ST_Y(latitude_postgis)), 4326), 15) OVER () AS cluster_id')
          )
          .whereNotNull('longitude_postgis')
          .whereNotNull('latitude_postgis')
          .where('asset_address', contractNameOrCollectionNameOrAddress)
          .as('clustered')
      )
      .groupBy('cluster_id');
  
    return this.parserResult(results, transformer);
  }

  async getCoordinatesPostGISPoints(
    contractNameOrCollectionNameOrAddress: string,
    bounds: string,
    filters: {[key: string]: boolean},
    transformer?: ITransformer,
  ) {

    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bounds.split(',').map(parseFloat);
  
    let query = this.model.query()
    .withGraphJoined('asset')
    
    query = query.where(function (this: QueryBuilder<NFTModel>) {
      this.where(`${NFTModel.tableName}.asset_address`, contractNameOrCollectionNameOrAddress);
      this.whereNotNull('longitude_postgis');
      this.whereNotNull('latitude_postgis');
      this.whereRaw(
        'ST_Intersects(ST_SetSRID(ST_MakePoint(ST_X(longitude_postgis), ST_Y(latitude_postgis)), 4326), ST_MakeEnvelope(?, ?, ?, ?, 4326))',
        [minLongitude, minLatitude, maxLongitude, maxLatitude]
      );
    })

    if(Object.values(filters).some(Boolean)) {
      if(filters.onlyListedHomes) {
        query = query.joinRaw(`INNER JOIN ${PropyKeysHomeListingModel.tableName} ON ${NFTModel.tableName}.asset_address = ${PropyKeysHomeListingModel.tableName}.asset_address AND ${PropyKeysHomeListingModel.tableName}.token_id = ${NFTModel.tableName}.token_id`)
      } else {
        let additionalFilters: IArbitraryQueryFilters[] = [];

        if(filters.onlyLandmarks) {
          additionalFilters.push({filter_type: 'Landmark', value: true, existence_check: true, metadata_filter: true});
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
      }
    }

    const results = await query.orderBy('mint_timestamp', 'DESC').limit(10000);
  
    return this.parserResult(results, transformer);
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
    contractNameOrCollectionNameOrAddress: string,
    network: string,
    metadataField: string,
    transformer?: ITransformer,
  ) {

    let metadataFieldName = metadataField.toLowerCase().replace(" ", "_");

    const result = await this.model.query()
    .select(this.model.raw(`DISTINCT attribute->>'value' AS ${metadataFieldName}`))
    .from(this.model.raw("?? AS nft", [this.model.tableName]))
    .joinRaw("INNER JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(nft.metadata->'attributes') = 'array' THEN nft.metadata->'attributes' ELSE '[]'::jsonb END) AS attribute ON true")
    .join('asset', 'nft.asset_address', '=', 'asset.address')
    .whereRaw(`attribute->>'trait_type' = '${metadataField}'`)
    .andWhereRaw("attribute->>'value' IS NOT NULL")
    .andWhere(function (this: QueryBuilder<NFTModel>) {
      this.where('asset.name', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.collection_name', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.address', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.slug', contractNameOrCollectionNameOrAddress);
    })
    .andWhere('nft.network_name', network);

    let resultsArray = result.map((value: {[key: string]: string}) => value[metadataFieldName]).sort();

    return this.parserResult(resultsArray, transformer);
  }

  async getUniqueMetadataFieldValuesWithListings(
    contractNameOrCollectionNameOrAddress: string,
    network: string,
    metadataField: string,
    transformer?: ITransformer,
  ) {

    let metadataFieldName = metadataField.toLowerCase().replace(" ", "_");

    const result = await this.model.query()
    .select(this.model.raw(`DISTINCT attribute->>'value' AS ${metadataFieldName}`))
    .from(this.model.raw("?? AS nft", [this.model.tableName]))
    .joinRaw("INNER JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(nft.metadata->'attributes') = 'array' THEN nft.metadata->'attributes' ELSE '[]'::jsonb END) AS attribute ON true")
    .join('asset', 'nft.asset_address', '=', 'asset.address')
    .joinRaw(`INNER JOIN propykeys_home_listing ON nft.asset_address = propykeys_home_listing.asset_address AND nft.token_id = propykeys_home_listing.token_id`)
    .whereRaw(`attribute->>'trait_type' = '${metadataField}'`)
    .andWhereRaw("attribute->>'value' IS NOT NULL")
    .andWhere(function (this: QueryBuilder<NFTModel>) {
      this.where('asset.name', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.collection_name', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.address', contractNameOrCollectionNameOrAddress);
      this.orWhere('asset.slug', contractNameOrCollectionNameOrAddress);
    })
    .andWhere('nft.network_name', network);

    let resultsArray = result.map((value: {[key: string]: string}) => value[metadataFieldName]).sort();

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
      longitude_postgis: this.model.raw('ST_SetSRID(ST_MakePoint(?, 0), 4326)', [longitude]),
      latitude_postgis: this.model.raw('ST_SetSRID(ST_MakePoint(0, ?), 4326)', [latitude]),
    }).where(function (this: QueryBuilder<NFTModel>) {
      this.where('asset_address', assetAddress);
      this.where('token_id', tokenId);
      this.where('network_name', networkName);
    });
  }

}

export default new NFTRepository()