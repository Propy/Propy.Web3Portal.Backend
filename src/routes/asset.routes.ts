'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/asset/:network/:assetAddress', [], 'AssetController@getAssetInfo');

Router.get('/asset/:network/:assetAddress/:tokenId', [], 'AssetController@getAssetInfoWithTokenId');

module.exports = Router.export();