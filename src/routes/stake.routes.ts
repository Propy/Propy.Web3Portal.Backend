'use strict';

import Router from "./Router";

Router.post('/stake/sync', [], 'StakeController@triggerStakeSync');

module.exports = Router.export();