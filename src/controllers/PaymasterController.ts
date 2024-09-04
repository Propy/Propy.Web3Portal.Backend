import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  AssetRepository,
  TokenTransferEventERC20Repository,
  TokenTransferEventERC721Repository,
  NFTRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import {
  newBundlerClient,
  newPaymasterClient,
  v06EntrypointAddress,
} from '../web3/paymaster';

import {
  VALID_SIGNATURE_CHAIN_IDS_TO_NETWORK_NAMES,
} from '../constants';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class PaymasterController extends Controller {
  async processPaymaster(req: Request, res: Response) {

    let paymasterMethod = req.body.method;

    let [
      userOperation,
      entryPoint,
      chainIdHex,
      context,
    ] = req.body.params;

    let {
      sender,
      callData,
    } = userOperation;

    console.log({userOperation})

    let networkName = VALID_SIGNATURE_CHAIN_IDS_TO_NETWORK_NAMES[Number(chainIdHex)] as "base" | "base-sepolia";

    if([8453, 84532].indexOf(Number(chainIdHex)) === -1) {
      this.sendError(res, "unsupported network");
      return;
    }

    console.log({networkName});

    console.log(`Ran processPaymaster at ${new Date().toISOString()}`);

    let paymasterClient = newPaymasterClient(networkName);

    let bundlerClient = newBundlerClient(sender, networkName);

    try {

      // Pad gas values so that the transaction is more likely to be accepted
      // TODO investigate why increasing gas limits causes txs to not work
      // userOperation.preVerificationGas = `0x${new BigNumber(userOperation.preVerificationGas).multipliedBy(1.3).integerValue().toString(16).padStart(1, '0')}`;
      // userOperation.callGasLimit = `0x${new BigNumber(userOperation.callGasLimit).multipliedBy(1.3).integerValue().toString(16).padStart(1, '0')}`;

      if(paymasterMethod === "pm_getPaymasterStubData") {

        const paymasterStub = await paymasterClient.getPaymasterStubData({
          ...userOperation,
          chainId: Number(chainIdHex),
          entryPointAddress: v06EntrypointAddress,
        });

        let responseData = {
          "jsonrpc": "2.0",
          "id": 1,
          "result": {
            "paymasterAndData": paymasterStub.paymasterAndData,
            "sponsor": {
              "name": "Propy",  
              "icon": "https://misc-propy-public-storage.s3.amazonaws.com/propy-house-only.png"
            }
          }
        }

        this.sendRawResponse(res, responseData);

      } else if (paymasterMethod === "pm_getPaymasterData") {

        // Get the final signed paymasterAndData 
        const paymasterData = await paymasterClient.getPaymasterData({
          chainId: Number(chainIdHex),
          entryPointAddress: v06EntrypointAddress,
          ...userOperation,
        });

        let responseData = {
          "jsonrpc": "2.0",
          "id": 1,
          "result": {
            "paymasterAndData": paymasterData.paymasterAndData,
            "sponsor": {
              "name": "Propy",  
              "icon": "https://misc-propy-public-storage.s3.amazonaws.com/propy-house-only.png"
            }
          }
        }

        this.sendRawResponse(res, responseData);
        
      } else {
        this.sendError(res, "invalid");
      }
    } catch (error) {
      console.log({"error sponsoring transaction": error})
      this.sendError(res, "invalid");
    }
    
  }
}

export default PaymasterController;