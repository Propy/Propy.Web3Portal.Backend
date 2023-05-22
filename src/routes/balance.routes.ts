'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
  isSupportedNetwork,
  isValidBalance,
} from "../web3/utils";

import Router from "./Router";

Router.get('/balances/combined', [], 'BalanceController@getCombinedUsdValue');

// todo add access control
Router.post('/balances/erc-20/create-shim', [
  body('holder_address').notEmpty().custom(isETHAddress),
  body('token_address').notEmpty().custom(isETHAddress),
  body('network').notEmpty().custom(isSupportedNetwork),
  body('balance').notEmpty().custom(isValidBalance),
], 'BalanceController@createERC20BalanceShim');

module.exports = Router.export();