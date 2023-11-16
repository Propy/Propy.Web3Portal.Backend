import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";
import { randomBytes } from 'crypto';

import BigNumber from 'bignumber.js';

import {
  UserRepository,
} from '../database/repositories';

import {
  verifySignedMessage,
} from '../utils';

import {
	createLog
} from '../logger';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class SignatureController extends Controller {
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
  async performSignatureAction(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      plaintext_message,
      signed_message,
      signer_address,
    } = payload;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(signer_address);
    } catch (error) {
      this.sendError(res, 'Invalid Signer Address');
      return;
    }

    // verify message
    let verificationResult = await verifySignedMessage(plaintext_message, signed_message, signer_address);

    if(!verificationResult.success) {
      return this.sendError(res, verificationResult.reason ? verificationResult.reason : "Unable to verify signature");
    } else {
      // signature verification successful, try to perform relevant action
      createLog({verificationResult})
      if(verificationResult.action === 'make_offer') {
        // validate metadata

        // check if an offer record on this token by this checksumAddress already exists

        // update offer record if exists

        // create offer record if not exists
      }
    }

    return this.sendResponse(res, {});
  }
}

export default SignatureController;