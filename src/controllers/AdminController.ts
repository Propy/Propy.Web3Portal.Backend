import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20
} from '../web3/jobs';

import {
  AdminRepository,
} from '../database/repositories';

import {
  IAssetRecordDB,
  IMixedBalancesResult,
  IOwnedBalancesResult,
} from '../interfaces';

import BalanceOutputTransformer from '../database/transformers/balance/output';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class AdminController extends Controller {
  async runFullSync(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      contract_address,
    } = payload;

    // TODO full sync trigger logic

    return this.sendResponse(res, {contract_address});

  }
}

export default AdminController;