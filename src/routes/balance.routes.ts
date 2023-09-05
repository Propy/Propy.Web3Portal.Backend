'use strict';

import Router from "./Router";

// Mixed balances are used to show a collection of shuffled balances on the home page
// This is especially useful for users who don't have a wallet connected, for the sake of home page content
Router.get('/balances/mix', [], 'BalanceController@getMixedBalances');

Router.get('/balances/:account', [], 'BalanceController@getAccountBalancesPaginated');

module.exports = Router.export();