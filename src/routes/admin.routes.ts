'use strict';

import { body, header } from 'express-validator';
import { authenticateJWTAdmin, isValidJWTAdmin } from "../middleware/authenticate";

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

// Admin routes

Router.post('/admin/run-full-sync/', [
  //@ts-ignore
  // authenticateAdminJWT,
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('contract_address').notEmpty().custom(isETHAddress),
], 'AdminController@runFullSync');

Router.post('/admin/trigger-resync-light/', [
  //@ts-ignore
  // authenticateAdminJWT,
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('contract_address').notEmpty().custom(isETHAddress),
], 'AdminController@triggerResyncLight');

Router.post('/admin/cancel-sync/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('contract_address').notEmpty().custom(isETHAddress),
], 'AdminController@cancelSync');

Router.get('/admin/asset-sync-track/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
], 'AdminController@getAssetSyncTrack');

// Router.post('/admin/trigger-resync-full/', [
//   //@ts-ignore
//   // authenticateAdminJWT,
//   header('Authorization').notEmpty().custom(isValidJWTAdmin),
//   body('contract_address').notEmpty().custom(isETHAddress),
// ], 'AdminController@triggerResyncFull');

module.exports = Router.export();