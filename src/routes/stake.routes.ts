'use strict';

import { body } from 'express-validator';

import Router from "./Router";

Router.post('/stake/sync', [
  body('version')
], 'StakeController@triggerStakeSync');

Router.get(`/stake/v3/leaderboard`, [], 'StakeController@leaderboardV3')

Router.get('/stake/v3/staking-events', [], 'StakeController@stakingEventsV3Paginated')

module.exports = Router.export();