import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  PropyKeysHomeListingRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import PropyKeysHomeListingOutputTransformer from '../database/transformers/listing/propykeys-listing-output';

import {
  fetchPropyKeysHomeListingSingle,
  syncSinglePropyKeysHomeListing,
} from '../tasks/full-sync-propykeys-home-listings';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class ListingController extends Controller {

  async getPropyKeysHomeListingInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let listingInfo = await PropyKeysHomeListingRepository.getListingByTokenIdAndAddressAndNetwork(tokenId, assetAddress, network);

    this.sendResponse(res, listingInfo ? PropyKeysHomeListingOutputTransformer.transform(listingInfo) : {});

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
}

export default ListingController;