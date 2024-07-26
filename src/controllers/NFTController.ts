import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  AssetRepository,
  TokenTransferEventERC721Repository,
  NFTRepository,
  NFTLikeRepository,
  NFTLikeCountRepository,
  GenericCacheRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import NftOutputTransformer from '../database/transformers/nft/output';
import NftCoordinateOutputTransformer from '../database/transformers/nft/coordinate-output';
import NftPostGISCoordinatePointClusterOutputTransformer from '../database/transformers/nft/postgis-point-cluster-coordinate-output';

import {
	syncTokenMetadata
} from '../tasks/sync-token-metadata';

import {
	createLog
} from '../logger';

import {
  IArbitraryQueryFilters,
  IArbitraryQuerySorter,
} from '../interfaces';

import {
  GENERIC_CACHE_KEYS,
  GENERIC_CACHE_AGES,
} from '../constants';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class NFTController extends Controller {

  async getNftInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    if(nftData?.asset) {
      if (nftData?.asset?.standard === 'ERC-721') {
        // Get some transfer events
        let transferEvents = await TokenTransferEventERC721Repository.paginate(15, 1, { contractAddress: assetAddress, tokenId });
        nftData.transfer_events_erc721 = transferEvents.data;
        nftData.transfer_events_erc721_pagination = transferEvents.pagination;
      }
    }

    this.sendResponse(res, nftData ? NftOutputTransformer.transform(nftData) : {});

  }

  async refreshNftMetadata(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      network = "",
      asset_address = "",
      token_id = "",
    } = req.body;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(asset_address, network, token_id);

    createLog({nftData})

    if(["ERC-721"].indexOf(nftData?.asset?.standard) > -1) {
      try {
        await syncTokenMetadata([nftData], nftData?.asset?.standard);
        return this.sendResponse(res, { message: "Asset metadata successfully refreshed" });
      } catch (e) {
        return this.sendError(res, 'Error refreshing asset metadata, please contact support if problem persists.', 500);
      }
    } else {
      return this.sendError(res, 'Asset record not found, please contact support if problem persists.', 500);
    }

  }

  async getNftLikeCount(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    if(!nftData) {
      return this.sendError(res, 'NFT not found');
    }

    let nftLikeCount = await NFTLikeCountRepository.getLikeCount(assetAddress, tokenId, network);

    if(nftLikeCount) {
      return this.sendResponse(res, { like_count: nftLikeCount.count });
    } else {
      return this.sendResponse(res, { like_count: 0 });
    }

  }

  async getNftLikedByStatus(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
      likerAddress = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    if(!nftData) {
      return this.sendError(res, 'NFT not found');
    }

    let nftLikeByAddress = await NFTLikeRepository.getLike(assetAddress, tokenId, network, likerAddress);

    return this.sendResponse(res, { like_status: nftLikeByAddress ? true : false });

  }

  async getUniqueMetadataFieldValues(req: Request, res: Response) {

    const {
      network,
      contractNameOrCollectionNameOrAddress,
      metadataField,
    } = req.params;

    let uniqueMetadataFieldData = await NFTRepository.getUniqueMetadataFieldValues(contractNameOrCollectionNameOrAddress, network, metadataField);

    return this.sendResponse(res, uniqueMetadataFieldData ? uniqueMetadataFieldData : []);

  }

  async getUniqueMetadataFieldValuesWithListings(req: Request, res: Response) {

    const {
      network,
      contractNameOrCollectionNameOrAddress,
      metadataField,
    } = req.params;

    let uniqueMetadataFieldData = await NFTRepository.getUniqueMetadataFieldValuesWithListings(contractNameOrCollectionNameOrAddress, network, metadataField);

    return this.sendResponse(res, uniqueMetadataFieldData ? uniqueMetadataFieldData : []);

  }

  async getRecentlyMintedPaginated(req: Request, res: Response) {

    const pagination = this.extractPagination(req);

    let nftData = await NFTRepository.getRecentlyMintedPaginated(pagination, NftOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCollectionPaginated(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const {
      country,
      city,
      landmark,
      attached_deed,
      owner,
      status,
      sort_by,
      sort_direction = 'DESC',
    } = req.query;

    const pagination = this.extractPagination(req);

    const additionalFilters : IArbitraryQueryFilters[] = [];
    
    if(city) {
      additionalFilters.push({filter_type: 'City', value: city.toString(), metadata_filter: true});
    }
    
    if(country) {
      additionalFilters.push({filter_type: 'Country', value: country.toString(), metadata_filter: true});
    }

    if(status) {
      additionalFilters.push({filter_type: 'Status', value: status.toString(), metadata_filter: true});
    }

    if(landmark) {
      additionalFilters.push({filter_type: 'Landmark', value: true, existence_check: true, metadata_filter: true});
    }

    if(attached_deed) {
      additionalFilters.push({filter_type: 'Attached Deed', value: true, existence_check: true, exclude_values: ["N/A"], metadata_filter: true});
    }

    if(owner) {
      additionalFilters.push({filter_type: 'balances.holder_address', value: owner.toString()});
    }

    let sortLogic : IArbitraryQuerySorter | undefined;
    let useSortDirection : "DESC" | "ASC" = sort_direction.toString().toUpperCase() === "ASC" ? "ASC" : "DESC";

    if(sort_by === 'likes') {
      sortLogic = {
        sort_by,
        sort_direction: useSortDirection,
      }
    }

    let nftData = await NFTRepository.getCollectionPaginated(contractNameOrCollectionNameOrAddress, pagination, additionalFilters, sortLogic, NftOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCoordinatesPaginated(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const pagination = this.extractPagination(req);

    let nftData = await NFTRepository.getCoordinatesPaginated(contractNameOrCollectionNameOrAddress, pagination, NftCoordinateOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCoordinates(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    // Check if we have a valid cached result
    let cachedData = await GenericCacheRepository.findByColumn("key", GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES(contractNameOrCollectionNameOrAddress));

    let nftData;
    let currentTimeUnix = Math.floor(new Date().getTime() / 1000);
    if(cachedData?.update_timestamp) {
      let shouldUpdate = (currentTimeUnix - Number(cachedData?.update_timestamp)) > cachedData?.max_seconds_age;
      if(shouldUpdate) {
        nftData = await NFTRepository.getCoordinates(contractNameOrCollectionNameOrAddress, NftCoordinateOutputTransformer);
        this.sendResponse(res, nftData ? nftData : {});
        await GenericCacheRepository.update({json: JSON.stringify(nftData), update_timestamp: currentTimeUnix, max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES}, cachedData.id);
        return;
      } else {
        nftData = cachedData.json;
      }
    } else {
      nftData = await NFTRepository.getCoordinates(contractNameOrCollectionNameOrAddress, NftCoordinateOutputTransformer);
      try {
        await GenericCacheRepository.create({
          key: GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES(contractNameOrCollectionNameOrAddress),
          update_timestamp: currentTimeUnix,
          json: JSON.stringify(nftData),
          max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES
        })
      } catch(e) {
        console.log("Error creating generic cache for coordinates");
      }
    }

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCoordinatesPostGISClusters(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    // Check if we have a valid cached result
    // let cachedData = await GenericCacheRepository.findByColumn("key", GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES(contractNameOrCollectionNameOrAddress));

    let nftData;
    let currentTimeUnix = Math.floor(new Date().getTime() / 1000);
    // if(cachedData?.update_timestamp) {
    //   let shouldUpdate = (currentTimeUnix - Number(cachedData?.update_timestamp)) > cachedData?.max_seconds_age;
    //   if(shouldUpdate) {
    //     nftData = await NFTRepository.getCoordinates(contractNameOrCollectionNameOrAddress, NftCoordinateOutputTransformer);
    //     this.sendResponse(res, nftData ? nftData : {});
    //     await GenericCacheRepository.update({json: JSON.stringify(nftData), update_timestamp: currentTimeUnix, max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES}, cachedData.id);
    //     return;
    //   } else {
    //     nftData = cachedData.json;
    //   }
    // } else {
      nftData = await NFTRepository.getCoordinatesPostGISClusters(contractNameOrCollectionNameOrAddress, NftPostGISCoordinatePointClusterOutputTransformer);
      // try {
      //   await GenericCacheRepository.create({
      //     key: GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES(contractNameOrCollectionNameOrAddress),
      //     update_timestamp: currentTimeUnix,
      //     json: JSON.stringify(nftData),
      //     max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES
      //   })
      // } catch(e) {
      //   console.log("Error creating generic cache for coordinates");
      // }
    // }

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCoordinatesPostGISPoints(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const {
      bounds = "-180,-90,180,90",
      onlyListedHomes = false,
      onlyLandmarks = false,
    } = req.query;

    const isDefaultBounds = bounds === "-180,-90,180,90";

    let filters = {
      onlyListedHomes: onlyListedHomes ===  "false" ? false : true,
      onlyLandmarks: onlyLandmarks ===  "false" ? false : true,
    }

    console.log({filters, onlyListedHomes, onlyLandmarks})

    // Check if we have a valid cached result
    let cachedData;
    if(isDefaultBounds) {
     cachedData = await GenericCacheRepository.findByColumn("key", GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES_WITH_BOUNDS(contractNameOrCollectionNameOrAddress, bounds.toString(), filters));
    }

    let nftData;
    let currentTimeUnix = Math.floor(new Date().getTime() / 1000);
    if(cachedData?.update_timestamp) {
      let shouldUpdate = (currentTimeUnix - Number(cachedData?.update_timestamp)) > cachedData?.max_seconds_age;
      if(shouldUpdate) {
        nftData = await NFTRepository.getCoordinatesPostGISPoints(contractNameOrCollectionNameOrAddress, bounds.toString(), filters, NftCoordinateOutputTransformer);
        this.sendResponse(res, nftData ? nftData : {});
        if(isDefaultBounds) {
          await GenericCacheRepository.update({json: JSON.stringify(nftData), update_timestamp: currentTimeUnix, max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES}, cachedData.id);
        }
        return;
      } else {
        nftData = cachedData.json;
      }
    } else {
      nftData = await NFTRepository.getCoordinatesPostGISPoints(contractNameOrCollectionNameOrAddress, bounds.toString(), filters, NftCoordinateOutputTransformer);
      if(isDefaultBounds) {
        try {
          await GenericCacheRepository.create({
            key: GENERIC_CACHE_KEYS.PROPYKEYS_COORDINATES_WITH_BOUNDS(contractNameOrCollectionNameOrAddress, bounds.toString(), filters),
            update_timestamp: currentTimeUnix,
            json: JSON.stringify(nftData),
            max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_COORDINATES
          })
        } catch(e) {
          console.log("Error creating generic cache for coordinates with bounds");
        }
      }
    }

    this.sendResponse(res, nftData ? nftData : {});

  }
}

export default NFTController;