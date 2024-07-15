import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  PropyKeysHomeListingRepository,
  NFTRepository,
  PropyKeysHomeListingLikeRepository,
  PropyKeysHomeListingLikeCountRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import PropyKeysHomeListingOutputTransformer from '../database/transformers/listing/propykeys-listing-output';

import {
  fetchPropyKeysHomeListingSingle,
  syncSinglePropyKeysHomeListing,
} from '../tasks/full-sync-propykeys-home-listings';

import {
  IArbitraryQueryFilters,
} from '../interfaces';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class ListingController extends Controller {

  async getPropyKeysHomeListingInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let listingInfo = await PropyKeysHomeListingRepository.getListingByTokenIdAndAddressAndNetwork(tokenId, assetAddress, network);

    let nftRecord = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    this.sendResponse(res, listingInfo ? PropyKeysHomeListingOutputTransformer.transform(listingInfo, nftRecord) : {});

  }

  async refreshListingMetadata(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      network = "",
      asset_address = "",
      token_id = "",
    } = req.body;

    try {
      let detailedListing = await fetchPropyKeysHomeListingSingle(network, asset_address, token_id);
      if(detailedListing?.id) {
        await syncSinglePropyKeysHomeListing(network, asset_address, detailedListing);
      } else {
        throw new Error("Listing details not found!");
      }
      return this.sendResponse(res, { message: "Listing metadata successfully refreshed" });
    } catch (e) {
      return this.sendError(res, 'Error refreshing asset metadata, please contact support if problem persists.', 500);
    }
  }

  async getPropyKeysHomeListingLikeCount(req: Request, res: Response) {

    const {
      propyKeysListingId = "",
    } = req.params;

    let homeListingData = await PropyKeysHomeListingRepository.getPropyKeysHomeListingById(propyKeysListingId);

    if(!homeListingData) {
      return this.sendError(res, 'Home listing not found');
    }

    let homeListingLikeCount = await PropyKeysHomeListingLikeCountRepository.getLikeCount(propyKeysListingId);

    if(homeListingLikeCount) {
      return this.sendResponse(res, { like_count: homeListingLikeCount.count });
    } else {
      return this.sendResponse(res, { like_count: 0 });
    }

  }

  async getPropyKeysHomeListingLikedByStatus(req: Request, res: Response) {

    const {
      propyKeysListingId = "",
      likerAddress = "",
    } = req.params;

    let homeListingData = await PropyKeysHomeListingRepository.getPropyKeysHomeListingById(propyKeysListingId);

    if(!homeListingData) {
      return this.sendError(res, 'Home listing not found');
    }

    let homeListingLikeByAddress = await PropyKeysHomeListingLikeRepository.getLike(propyKeysListingId, likerAddress);

    return this.sendResponse(res, { like_status: homeListingLikeByAddress ? true : false });

  }

  async getCollectionPaginated(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const {
      country,
      city,
      min_price,
      max_price,
      min_bedrooms,
      min_bathrooms,
      min_lot_size,
      min_floor_size,
    } = req.query;

    const pagination = this.extractPagination(req);

    const listingFilters : IArbitraryQueryFilters[] = [];

    if(min_price) {
      listingFilters.push({filter_type: 'price', value: min_price.toString(), operator: ">="})
    }

    if(max_price) {
      listingFilters.push({filter_type: 'price', value: max_price.toString(), operator: "<="})
    }

    if(min_bedrooms) {
      listingFilters.push({filter_type: 'bedrooms', value: min_bedrooms.toString(), operator: ">="})
    }

    if(min_bathrooms) {
      listingFilters.push({filter_type: 'bathrooms', value: min_bathrooms.toString(), operator: ">="})
    }

    if(min_lot_size) {
      listingFilters.push({filter_type: 'lot_size', value: min_lot_size.toString(), operator: ">="})
    }

    if(min_floor_size) {
      listingFilters.push({filter_type: 'size', value: min_floor_size.toString(), operator: ">="})
    }

    const nftMetadataFilters : IArbitraryQueryFilters[] = [];
    
    if(city) {
      nftMetadataFilters.push({filter_type: 'City', value: city.toString(), metadata_filter: true});
    }
    
    if(country) {
      nftMetadataFilters.push({filter_type: 'Country', value: country.toString(), metadata_filter: true});
    }

    let nftData = await PropyKeysHomeListingRepository.getCollectionPaginated(contractNameOrCollectionNameOrAddress, pagination, listingFilters, nftMetadataFilters, PropyKeysHomeListingOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }
}

export default ListingController;