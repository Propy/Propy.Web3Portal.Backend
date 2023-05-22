'use strict';

import Router from "./Router";

Router.get('/asset/:network/:assetAddress', [], 'AssetController@getAssetInfo');

module.exports = Router.export();