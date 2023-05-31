import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import {
  AssetRepository,
  BalanceRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20
} from '../web3/jobs';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class BalanceController extends Controller {
  async getAccountBalances(req: Request, res: Response) {

    const {
      account
    } = req.params;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(account);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    let balances = await BalanceRepository.getBalanceByHolder(checksumAddress);

    this.sendResponse(res, balances ? balances : {});
  }
}

export default BalanceController;