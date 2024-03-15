'use strict';

import Router from "./Router";

Router.get('/gas-estimate/max-priority-fee-per-gas/:network', [], 'GasEstimateController@getMaxPriorityFeePerGasEstimateForNetwork');

module.exports = Router.export();