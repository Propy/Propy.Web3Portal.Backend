'use strict';

import Router from "./Router";

Router.get('/balances/:account', [], 'BalanceController@getAccountBalances');

module.exports = Router.export();