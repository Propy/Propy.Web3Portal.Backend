'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/nft/:network/:assetAddress/:tokenId', [], 'NFTController@getNftInfoWithTokenId');

// Router.post('/nft/refresh-metadata', [
//   body('network').notEmpty(),
//   body('asset_address').notEmpty().custom(isETHAddress),
//   body('token_id').notEmpty(),
// ], 'NFTController@refreshNftMetadata');

module.exports = Router.export();