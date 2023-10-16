'use strict';

import { body, header } from 'express-validator';
import { authenticateJWTAdmin, isValidJWTAdmin } from "../middleware/authenticate";

import {
  isETHAddress,
  isSyncMeta,
  isValidNetworkName,
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
  body('meta').notEmpty().custom(isSyncMeta),
  body('network').notEmpty().custom(isValidNetworkName),
], 'AdminController@triggerResyncLight');

Router.post('/admin/cancel-sync/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('contract_address').notEmpty().custom(isETHAddress),
  body('meta').notEmpty().custom(isSyncMeta),
  body('network').notEmpty().custom(isValidNetworkName),
], 'AdminController@cancelSync');

Router.get('/admin/asset-sync-track/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
], 'AdminController@getAssetSyncTrack');

Router.get('/admin/metadata-sync-track/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
], 'AdminController@getMetadataSyncTrack');

Router.post('/admin/sync-performance-log-timeseries/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('metric_name').notEmpty().isString(),
], 'AdminController@getSyncPerformanceLogTimeseries');

Router.post('/admin/system-report/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('report_name').notEmpty().isString(),
], 'AdminController@getSystemReport');

Router.post('/admin/generate-system-report/', [
  header('Authorization').notEmpty().custom(isValidJWTAdmin),
  body('report_name').notEmpty().isString(),
], 'AdminController@generateSystemReport');

// Router.post('/admin/trigger-resync-full/', [
//   //@ts-ignore
//   // authenticateAdminJWT,
//   header('Authorization').notEmpty().custom(isValidJWTAdmin),
//   body('contract_address').notEmpty().custom(isETHAddress),
// ], 'AdminController@triggerResyncFull');

module.exports = Router.export();