'use strict';

import { body } from 'express-validator';

import Router from "./Router";

// Admin Auth

Router.post('/login/admin', [
  body('username').notEmpty(),
  body('password').notEmpty(),
], 'AuthController@loginAdmin');

// User Auth

module.exports = Router.export();