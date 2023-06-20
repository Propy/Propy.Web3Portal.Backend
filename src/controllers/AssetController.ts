import e, { Request, Response } from 'express';
import { utils } from "ethers";

import {
  AssetRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import {
  AssetOutputTransformer,
} from '../database/transformers';

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
}

export default AssetController;