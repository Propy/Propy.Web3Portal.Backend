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

import {
  getCombinedValueBreakdownOfAccounts,
} from '../tasks/get-combined-value-breakdown-of-accounts';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class BalanceController extends Controller {
  async getCombinedUsdValue(req: Request, res: Response) {

    const {
      addresses = ""
    } = req.query;

    let addressesArray = addresses.toString().split(",");
    let { total, assetAddressToValue } = await getCombinedValueBreakdownOfAccounts(addressesArray);

    this.sendResponse(res, {
      total,
      assetAddressToValue,
    });
  }
  async createERC20BalanceShim(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
        return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      holder_address,
      token_address,
      network,
      balance,
    } = req.body;

    console.log({
      holder_address,
      token_address,
      network,
      balance,
    })

    // Check if we already have this asset stored
    let existingAssetRecord = await AssetRepository.getAssetByAddressAndNetwork(token_address, network);

    console.log(existingAssetRecord ? "asset record already exists" : "asset record does not exist, creating");

    if(!existingAssetRecord) {

      try {
        let tokenInfo = await getTokenInfoERC20(token_address, network);
        // Create asset record
        await AssetRepository.create({
          address: tokenInfo.address,
          network_name: tokenInfo.network,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          standard: tokenInfo.standard,
          decimals: tokenInfo.decimal,
        });
      } catch (e) {
        return this.sendResponse(res, {errors: errors.array()}, "Unable to fetch token info, make sure network and token_address are correct", 500);
      }

    }
    
    this.sendResponse(res, {success: true});
  }
}

export default BalanceController;