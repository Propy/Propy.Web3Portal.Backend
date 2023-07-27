import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  AssetRepository,
  TokenTransferEventERC721Repository,
  NFTRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import NftOutputTransformer from '../database/transformers/nft/output';

// import {
// 	syncTokenMetadata
// } from '../tasks/sync-token-metadata';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class NFTController extends Controller {

  async getNftInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    console.log({nftData})

    if(nftData?.asset) {
      if (nftData?.asset?.standard === 'ERC-721') {
        // Get some transfer events
        let transferEvents = await TokenTransferEventERC721Repository.paginate(15, 1, { contractAddress: assetAddress, tokenId });
        nftData.transfer_events_erc721 = transferEvents.data;
        nftData.transfer_events_erc721_pagination = transferEvents.pagination;
      }
    }

    this.sendResponse(res, nftData ? NftOutputTransformer.transform(nftData) : {});

  }

  // async refreshAssetMetadata(req: Request, res: Response) {

  //   const errors = await validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
  //   }

  //   const {
  //     network = "",
  //     asset_address = "",
  //     token_id = "",
  //   } = req.body;

  //   let assetInfo = await AssetRepository.getAssetBalancesByAddressAndNetworkAndTokenId(asset_address, network, token_id);

  //   if((assetInfo?.balances?.length > 0) && (["ERC-721"].indexOf(assetInfo?.standard) > -1)) {
  //     try {
  //       await syncTokenMetadata(assetInfo?.balances, assetInfo.standard);
  //       return this.sendResponse(res, { message: "Token metadata successfully refreshed" });
  //     } catch (e) {
  //       return this.sendError(res, 'Error refreshing token metadata, please contact support if problem persists.', 500);
  //     }
  //   } else {
  //     return this.sendError(res, 'Token record not found, please contact support if problem persists.', 500);
  //   }

  // }
}

export default NFTController;