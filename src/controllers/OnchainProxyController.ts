import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20,
  getBalanceOfERC20,
} from '../web3/jobs';

import {
  AssetRepository,
  BalanceRepository,
} from '../database/repositories';

import {
  IAssetRecordDB,
  IMixedBalancesResult,
  IOwnedBalancesResult,
} from '../interfaces';

import {
	createLog
} from '../logger';

import {
  NETWORK_TO_ENDPOINT,
} from '../constants';

import BalanceOutputTransformer from '../database/transformers/balance/output';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class OnchainProxyController extends Controller {
  async getBalanceERC20(req: Request, res: Response) {

    const {
      network,
      account,
      assetAddress,
    } = req.params;

    let checksumHolderAddress = '';
    if(account) {
      try {
        checksumHolderAddress = utils.getAddress(account);
      } catch (error) {
        this.sendError(res, 'Invalid Account Address');
        return;
      }
    }

    let checksumAssetAddress;
    try {
      checksumAssetAddress = utils.getAddress(assetAddress);
    } catch (error) {
      this.sendError(res, 'Invalid Asset Address');
      return;
    }

    if(!NETWORK_TO_ENDPOINT[network]) {
      this.sendError(res, 'Invalid Network');
      return;
    }

    let tokenInfo = await getTokenInfoERC20(assetAddress, network);

    let balance = await getBalanceOfERC20([assetAddress], account, network);

    let response = {
      token_info: tokenInfo,
      balance: balance,
    }

    this.sendResponse(res, response ? response : {});
  }
}

export default OnchainProxyController;