import e, { Request, Response } from 'express';
import { validationResult } from "express-validator";
import { utils } from "ethers";

import {
  AssetRepository,
  TokenTransferEventERC721Repository,
  NFTRepository,
  NFTLikeRepository,
  NFTLikeCountRepository,
} from '../database/repositories';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import NftOutputTransformer from '../database/transformers/nft/output';
import NftCoordinateOutputTransformer from '../database/transformers/nft/coordinate-output';

import {
	syncTokenMetadata
} from '../tasks/sync-token-metadata';

import {
	createLog
} from '../logger';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class NFTController extends Controller {

  async getNftInfoWithTokenId(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

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

  async refreshNftMetadata(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      network = "",
      asset_address = "",
      token_id = "",
    } = req.body;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(asset_address, network, token_id);

    createLog({nftData})

    if(["ERC-721"].indexOf(nftData?.asset?.standard) > -1) {
      try {
        await syncTokenMetadata([nftData], nftData?.asset?.standard);
        return this.sendResponse(res, { message: "Asset metadata successfully refreshed" });
      } catch (e) {
        return this.sendError(res, 'Error refreshing asset metadata, please contact support if problem persists.', 500);
      }
    } else {
      return this.sendError(res, 'Asset record not found, please contact support if problem persists.', 500);
    }

  }

  async getNftLikeCount(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    if(!nftData) {
      return this.sendError(res, 'NFT not found');
    }

    let nftLikeCount = await NFTLikeCountRepository.getLikeCount(assetAddress, tokenId, network);

    if(nftLikeCount) {
      return this.sendResponse(res, { like_count: nftLikeCount.count });
    } else {
      return this.sendResponse(res, { like_count: 0 });
    }

  }

  async getNftLikedByStatus(req: Request, res: Response) {

    const {
      network = "",
      assetAddress = "",
      tokenId = "",
      likerAddress = "",
    } = req.params;

    let nftData = await NFTRepository.getNftByAddressAndNetworkAndTokenId(assetAddress, network, tokenId);

    if(!nftData) {
      return this.sendError(res, 'NFT not found');
    }

    let nftLikeByAddress = await NFTLikeRepository.getLike(assetAddress, tokenId, network, likerAddress);

    return this.sendResponse(res, { like_status: nftLikeByAddress ? true : false });

  }

  async getRecentlyMintedPaginated(req: Request, res: Response) {

    const pagination = this.extractPagination(req);

    let nftData = await NFTRepository.getRecentlyMintedPaginated(pagination, NftOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCollectionPaginated(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const pagination = this.extractPagination(req);

    let nftData = await NFTRepository.getCollectionPaginated(contractNameOrCollectionNameOrAddress, pagination, NftOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }

  async getCoordinatesPaginated(req: Request, res: Response) {

    const {
      contractNameOrCollectionNameOrAddress,
    } = req.params;

    const pagination = this.extractPagination(req);

    let nftData = await NFTRepository.getCoordinatesPaginated(contractNameOrCollectionNameOrAddress, pagination, NftCoordinateOutputTransformer);

    this.sendResponse(res, nftData ? nftData : {});

  }
}

export default NFTController;