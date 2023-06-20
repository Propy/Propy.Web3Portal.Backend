'use strict';

import Router from "./Router";

Router.get('/asset/:network/:assetAddress', [], 'AssetController@getAssetInfo');

Router.get('/asset/:network/:assetAddress/:tokenId', [], 'AssetController@getAssetInfoWithTokenId');

module.exports = Router.export();