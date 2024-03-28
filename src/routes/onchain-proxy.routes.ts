'use strict';

import Router from "./Router";

Router.get('/onchain-proxy/balance-erc20/:network/:assetAddress/:account', [], 'OnchainProxyController@getBalanceERC20');

module.exports = Router.export();