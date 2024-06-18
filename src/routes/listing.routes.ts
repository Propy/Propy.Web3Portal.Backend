'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/listing/propykeys/:network/:assetAddress/:tokenId', [], 'ListingController@getPropyKeysHomeListingInfoWithTokenId');

Router.post('/listing/refresh-metadata', [
  body('network').notEmpty(),
  body('asset_address').notEmpty().custom(isETHAddress),
  body('token_id').notEmpty(),
], 'ListingController@refreshListingMetadata');

module.exports = Router.export();