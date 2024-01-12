'use strict';

import { body } from 'express-validator';

import {
  isValidNetworkName,
} from "../web3/utils";

import Router from "./Router";

Router.get('/bridge/base/transaction/overview', [], 'BridgeController@getBaseBridgeTransactionByTransactionHash');
Router.get('/bridge/base/transactions/overview', [], 'BridgeController@getBaseBridgeOverviewByAccountAndTokenAddresses');
Router.get('/bridge/base/withdrawals/overview', [], 'BridgeController@getBaseBridgeWithdrawalsOverviewByAccountAndTokenAddresses');
Router.get('/bridge/base/deposits/overview', [], 'BridgeController@getBaseBridgeDepositsOverviewByAccountAndTokenAddresses');
Router.post('/bridge/sync', [
  body('l1_network').notEmpty().custom(isValidNetworkName),
  body('l2_network').notEmpty().custom(isValidNetworkName),
], 'BridgeController@triggerBridgeSync');

module.exports = Router.export();