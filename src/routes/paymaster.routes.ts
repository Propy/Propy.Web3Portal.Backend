'use strict';

import Router from "./Router";

Router.post('/paymaster', [], 'PaymasterController@processPaymaster');

module.exports = Router.export();