'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/asset/:network/:assetAddress', [], 'AssetController@getAssetInfo');

Router.get('/asset/:network/:assetAddress/:tokenId', [], 'AssetController@getAssetInfoWithTokenId');

Router.post('/asset/refresh-metadata', [
  body('network').notEmpty(),
  body('asset_address').notEmpty().custom(isETHAddress),
  body('token_id').notEmpty(),
], 'AssetController@refreshAssetMetadata');

module.exports = Router.export();