'use strict';

import { body } from 'express-validator';

import Router from "./Router";

Router.post('/stake/sync', [
  body('version')
], 'StakeController@triggerStakeSync');

module.exports = Router.export();