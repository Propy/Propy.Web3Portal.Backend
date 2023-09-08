'use strict';

import Router from "./Router";

Router.get('/api/ping', [], 'ApiController@ping');

module.exports = Router.export();