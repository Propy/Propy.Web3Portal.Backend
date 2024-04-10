'use strict';

import Router from "./Router";

Router.get('/geo/locate', [], 'GeoController@locate');

module.exports = Router.export();