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

    if(assetInfo) {
      if(assetInfo.standard === 'ERC-20') {
        let transferEvents = await TokenTransferEventERC20Repository.paginate(15, 1, { contractAddress: assetAddress });
        assetInfo.transfer_events_erc20 = transferEvents.data;
        assetInfo.transfer_events_erc20_pagination = transferEvents.pagination;
      } else if (assetInfo.standard === 'ERC-721') {
        let transferEvents = await TokenTransferEventERC721Repository.paginate(15, 1, { contractAddress: assetAddress });
        assetInfo.transfer_events_erc20 = transferEvents.data;
        assetInfo.transfer_events_erc20_pagination = transferEvents.pagination;
      }
    }

    this.sendResponse(res, assetInfo ? assetInfo : {});
  }

  async getAssetInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let assetInfo = await AssetRepository.getAssetByAddressAndNetwork(assetAddress, network);

    if(assetInfo) {
      if (assetInfo.standard === 'ERC-721') {
        // Get some transfer events
        let transferEvents = await TokenTransferEventERC721Repository.paginate(15, 1, { contractAddress: assetAddress, tokenId });
        assetInfo.transfer_events_erc721 = transferEvents.data;
        assetInfo.transfer_events_erc721_pagination = transferEvents.pagination;
        // Get balance & metadata
        let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);
        assetInfo.balances = nftData?.balances;
        assetInfo.metadata = nftData?.metadata;
      }
    }

    this.sendResponse(res, assetInfo ? AssetOutputTransformer.transform(assetInfo) : {});

  }
}

export default AssetController;