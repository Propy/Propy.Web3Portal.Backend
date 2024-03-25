'use strict';

import Router from "./Router";

Router.get('/timeseries/mints/:network/:contractAddress', [], 'TimeseriesController@getMintedPerDay');

module.exports = Router.export();