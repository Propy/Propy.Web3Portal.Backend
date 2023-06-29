import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  AssetRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import {
  AssetOutputTransformer,
} from '../database/transformers';

import {
	syncTokenMetadata
} from '../tasks/sync-token-metadata';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class AssetController extends Controller {
  async getAssetInfo(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
    } = req.params;

    let assetInfo = await AssetRepository.getAssetByAddressAndNetwork(assetAddress, network, AssetOutputTransformer);

    this.sendResponse(res, assetInfo ? assetInfo : {});
  }

  async getAssetInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let assetInfo = await AssetRepository.getAssetByAddressAndNetworkAndTokenId(assetAddress, network, tokenId, AssetOutputTransformer);

    this.sendResponse(res, assetInfo ? assetInfo : {});

  }

  async refreshAssetMetadata(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      network = "",
      asset_address = "",
      token_id = "",
    } = req.body;

    let assetInfo = await AssetRepository.getAssetByAddressAndNetworkAndTokenId(asset_address, network, token_id);

    if((assetInfo?.balance?.length > 0) && (["ERC-721"].indexOf(assetInfo?.standard) > -1)) {
      try {
        await syncTokenMetadata(assetInfo?.balance, assetInfo.standard);
        return this.sendResponse(res, { message: "Token metadata successfully refreshed" });
      } catch (e) {
        return this.sendError(res, 'Error refreshing token metadata, please contact support if problem persists.', 500);
      }
    } else {
      return this.sendError(res, 'Token record not found, please contact support if problem persists.', 500);
    }

  }
}

export default AssetController;