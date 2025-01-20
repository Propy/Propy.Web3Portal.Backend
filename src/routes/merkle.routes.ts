'use strict';

import { body } from 'express-validator';

import Router from "./Router";

Router.post('/merkle/get-root', [
  body('stringified_json').notEmpty(),
], 'MerkleController@getRoot');

module.exports = Router.export();