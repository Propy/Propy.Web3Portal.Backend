'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

// User Signatures

Router.post('/signature/nonce', [
  body('signer_address').notEmpty().custom(isETHAddress),
], 'SignatureController@getUserNonce');

Router.post('/signature/perform-action', [
  body('plaintext_message').notEmpty(),
  body('signed_message').notEmpty(),
  body('signer_address').notEmpty().custom(isETHAddress),
], 'SignatureController@performSignatureAction');

module.exports = Router.export();