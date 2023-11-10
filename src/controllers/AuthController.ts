import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";
import { randomBytes } from 'crypto';

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20
} from '../web3/jobs';

import {
  AdminRepository,
  UserRepository,
} from '../database/repositories';

import {
  IAssetRecordDB,
  IMixedBalancesResult,
  IOwnedBalancesResult,
} from '../interfaces';

import BalanceOutputTransformer from '../database/transformers/balance/output';

import {
  verifyPassword
} from '../utils/password';

import {
  generateJWTAdmin,
  returnLatestValidAdminJWT,
} from '../middleware/authenticate';

import {
	createLog
} from '../logger';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class AuthController extends Controller {
  async loginAdmin(req: Request, res: Response) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }
    const payload = req.body;

    const {
      username,
      password
    } = payload;

    let adminRecord = await AdminRepository.findByColumn('username', username);

    createLog({adminRecord});

    if(adminRecord) {

      let isValidPassword = await verifyPassword(password, adminRecord.password_bcrypt_hash);

      createLog({isValidPassword})

      if(isValidPassword) {
        // generate jwt
        let jwtToken = generateJWTAdmin();
        return this.sendResponse(res, {jwt: jwtToken});
      }

    }

    return this.sendError(res, 'invalid credentials', 403);
  }
  async jwtCheckpointAdmin(req: Request, res: Response) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if(errors.array().find((item) => item.param === "authorization")) {
          return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
        }
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 422);
    }

    let currentAuthHeader = req.header("authorization");

    let latestToken = returnLatestValidAdminJWT(currentAuthHeader);

    this.sendResponse(res, {token: latestToken, is_fresh_token: currentAuthHeader && latestToken && currentAuthHeader.indexOf(latestToken) === -1});

  }
  async getUserNonce(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      signer_address,
    } = payload;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(signer_address);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    let userRecord = await UserRepository.findByColumn("address", checksumAddress);

    if(!userRecord) {
      let salt = randomBytes(32).toString('hex');
      await UserRepository.create({address: checksumAddress, salt });
      userRecord = await UserRepository.findByColumn("address", checksumAddress);
    }

    return this.sendResponse(res, {nonce: userRecord.nonce, salt: userRecord.salt});
  }
  async runFullSync(req: Request, res: Response) {

  }
}

export default AuthController;