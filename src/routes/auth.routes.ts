'use strict';

import { body, header } from 'express-validator';

import { authenticateJWTAdmin, isValidJWTAdmin } from "../middleware/authenticate";

import Router from "./Router";

// Admin Auth

Router.post('/login/admin', [
  body('username').notEmpty(),
  body('password').notEmpty(),
], 'AuthController@loginAdmin');

Router.get('/login/admin/jwt-checkpoint', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
], 'AuthController@jwtCheckpointAdmin');

// User Auth

module.exports = Router.export();