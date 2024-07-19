import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";
import { randomBytes } from 'crypto';

import BigNumber from 'bignumber.js';

import {
  UserRepository,
  NFTRepository,
  AssetRepository,
  OffchainOfferRepository,
  NFTLikeRepository,
  NFTLikeCountRepository,
  PropyKeysHomeListingRepository,
  PropyKeysHomeListingLikeRepository,
  PropyKeysHomeListingLikeCountRepository,
} from '../database/repositories';

import {
  verifySignedMessage,
  actionHasRequiredMetadataParts,
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
      if(verificationResult.action === 'make_offchain_offer') {
        // validate metadata
        let requiredPartsCheck = actionHasRequiredMetadataParts(verificationResult.action, verificationResult.metadata);
        if(requiredPartsCheck.success) {
          // verify that NFT is valid
          let {
            token_address,
            token_id,
            token_network,
            offer_token_address,
            offer_token_amount
          } = verificationResult.metadata;
          let nftRecord = await NFTRepository.getNftByAddressAndNetworkAndTokenId(token_address, token_network, token_id);
          if(!nftRecord) {
            return this.sendError(res, "NFT not found");
          }
          // verify that payment token is valid
          let paymentTokenRecord = await AssetRepository.getAssetByAddress(offer_token_address);
          if(!paymentTokenRecord) {
            return this.sendError(res, "Invalid payment token");
          }
          // verify that user record / checksumAddress is valid
          let userRecord = await UserRepository.findByColumn("address", checksumAddress);
          if(!userRecord) {
            return this.sendError(res, "Invalid user address");
          }
          // check if an offer record on this token by this checksumAddress already exists
          let existingOffer = await OffchainOfferRepository.getOffchainOfferByUserAddressAndAssetAddressAndTokenId(checksumAddress, token_address, token_id);
          if(existingOffer) {
            // update offer record if exists
            createLog("Existing offer, update");
            await OffchainOfferRepository.update({
              asset_address: token_address,
              token_id: token_id,
              user_address: checksumAddress,
              offer_token_address,
              offer_token_amount,
              timestamp_unix: verificationResult.timestamp,
            }, existingOffer.id);
            return this.sendResponse(res, {message: "Offer successfully updated!"});
          } else {
            // create offer record if not exists
            createLog("New offer, create");
            await OffchainOfferRepository.create({
              asset_address: token_address,
              token_id: token_id,
              user_address: checksumAddress,
              offer_token_address,
              offer_token_amount,
              timestamp_unix: verificationResult.timestamp,
            });
            return this.sendResponse(res, {message: "Offer successfully placed!"});
          }
        } else {
          return this.sendError(res, requiredPartsCheck.message);
        }
      }
      if(verificationResult.action === 'add_like_nft') {
        // validate metadata
        let requiredPartsCheck = actionHasRequiredMetadataParts(verificationResult.action, verificationResult.metadata);
        if(requiredPartsCheck.success) {
          // verify that NFT is valid
          let {
            token_address,
            token_id,
            token_network,
          } = verificationResult.metadata;
          let nftRecord = await NFTRepository.getNftByAddressAndNetworkAndTokenId(token_address, token_network, token_id);
          if(!nftRecord) {
            return this.sendError(res, "NFT not found");
          }
          // verify that user record / checksumAddress is valid
          let userRecord = await UserRepository.findByColumn("address", checksumAddress);
          if(!userRecord) {
            return this.sendError(res, "Invalid user address");
          }
          // check if an offer record on this token by this checksumAddress already exists
          let existingLike = await NFTLikeRepository.getLike(token_address, token_id, token_network, checksumAddress);
          if(existingLike) {
            return this.sendResponse(res, {message: "NFT liked!"});
          } else {
            // create like record if not exists
            createLog("New like, create");
            await NFTLikeRepository.create({
              contract_address: token_address,
              token_id: token_id,
              network_name: token_network,
              liker_address: checksumAddress,
              timestamp_unix: verificationResult.timestamp,
            });
            // check if like count record exists for token
            let existingLikeCountRecord = await NFTLikeCountRepository.getLikeCount(token_address, token_id, token_network);
            if(!existingLikeCountRecord) {
              // create new like count record
              await NFTLikeCountRepository.create({
                contract_address: token_address,
                token_id: token_id,
                network_name: token_network,
                count: 1,
              })
            } else {
              // update existing like count record
              await NFTLikeCountRepository.update({
                count: existingLikeCountRecord.count + 1,
              }, existingLikeCountRecord.id);
            }
            return this.sendResponse(res, {message: "NFT liked!"});
          }
        } else {
          return this.sendError(res, requiredPartsCheck.message);
        }
      }
      if(verificationResult.action === 'remove_like_nft') {
        // validate metadata
        let requiredPartsCheck = actionHasRequiredMetadataParts(verificationResult.action, verificationResult.metadata);
        if(requiredPartsCheck.success) {
          // verify that NFT is valid
          let {
            token_address,
            token_id,
            token_network,
          } = verificationResult.metadata;
          let nftRecord = await NFTRepository.getNftByAddressAndNetworkAndTokenId(token_address, token_network, token_id);
          if(!nftRecord) {
            return this.sendError(res, "NFT not found");
          }
          // verify that user record / checksumAddress is valid
          let userRecord = await UserRepository.findByColumn("address", checksumAddress);
          if(!userRecord) {
            return this.sendError(res, "Invalid user address");
          }
          // check if an offer record on this token by this checksumAddress already exists
          let existingLike = await NFTLikeRepository.getLike(token_address, token_id, token_network, checksumAddress);
          if(!existingLike) {
            return this.sendResponse(res, {message: "NFT like removed!"});
          } else {
            // remove existing like
            await NFTLikeRepository.delete(existingLike.id);
            // check if like count record exists for token
            let existingLikeCountRecord = await NFTLikeCountRepository.getLikeCount(token_address, token_id, token_network);
            if(!existingLikeCountRecord) {
              return this.sendResponse(res, {message: "NFT like removed!"});
            } else {
              // update existing like count record
              await NFTLikeCountRepository.update({
                count: existingLikeCountRecord.count - 1,
              }, existingLikeCountRecord.id);
            }
            return this.sendResponse(res, {message: "NFT like removed!"});
          }
        } else {
          return this.sendError(res, requiredPartsCheck.message);
        }
      }
      if(verificationResult.action === 'add_like_propykeys_listing') {
        // validate metadata
        let requiredPartsCheck = actionHasRequiredMetadataParts(verificationResult.action, verificationResult.metadata);
        if(requiredPartsCheck.success) {
          // verify that NFT is valid
          let {
            listing_id
          } = verificationResult.metadata;
          let homeListingData = await PropyKeysHomeListingRepository.getPropyKeysHomeListingById(listing_id);
          if(!homeListingData) {
            return this.sendError(res, 'Home listing not found');
          }
          // verify that user record / checksumAddress is valid
          let userRecord = await UserRepository.findByColumn("address", checksumAddress);
          if(!userRecord) {
            return this.sendError(res, "Invalid user address");
          }
          // check if an offer record on this token by this checksumAddress already exists
          let existingLike = await PropyKeysHomeListingLikeRepository.getLike(listing_id, checksumAddress);
          console.log({existingLike})
          if(existingLike) {
            return this.sendResponse(res, {message: "PropyKeys home listing liked!"});
          } else {
            // create like record if not exists
            createLog("New like, create");
            await PropyKeysHomeListingLikeRepository.create({
              propykeys_listing_id: listing_id,
              liker_address: checksumAddress,
              timestamp_unix: verificationResult.timestamp,
            });
            // check if like count record exists for token
            let existingLikeCountRecord = await PropyKeysHomeListingLikeCountRepository.getLikeCount(listing_id);
            console.log({existingLikeCountRecord})
            if(!existingLikeCountRecord) {
              // create new like count record
              await PropyKeysHomeListingLikeCountRepository.create({
                propykeys_listing_id: listing_id,
                count: 1,
              })
            } else {
              // update existing like count record
              await PropyKeysHomeListingLikeCountRepository.update({
                count: existingLikeCountRecord.count + 1,
              }, existingLikeCountRecord.id);
            }
            return this.sendResponse(res, {message: "PropyKeys home listing liked!"});
          }
        } else {
          return this.sendError(res, requiredPartsCheck.message);
        }
      }
      if(verificationResult.action === 'remove_like_propykeys_listing') {
        // validate metadata
        let requiredPartsCheck = actionHasRequiredMetadataParts(verificationResult.action, verificationResult.metadata);
        if(requiredPartsCheck.success) {
          // verify that NFT is valid
          let {
            listing_id
          } = verificationResult.metadata;
          let homeListingData = await PropyKeysHomeListingRepository.getPropyKeysHomeListingById(listing_id);
          if(!homeListingData) {
            return this.sendError(res, 'Home listing not found');
          }
          // verify that user record / checksumAddress is valid
          let userRecord = await UserRepository.findByColumn("address", checksumAddress);
          if(!userRecord) {
            return this.sendError(res, "Invalid user address");
          }
          // check if an offer record on this token by this checksumAddress already exists
          let existingLike = await PropyKeysHomeListingLikeRepository.getLike(listing_id, checksumAddress);
          console.log({existingLike})
          if(!existingLike) {
            return this.sendResponse(res, {message: "PropyKeys home listing like removed!"});
          } else {
            // remove existing like
            await PropyKeysHomeListingLikeRepository.delete(existingLike.id);
            // check if like count record exists for token
            let existingLikeCountRecord = await PropyKeysHomeListingLikeCountRepository.getLikeCount(listing_id);
            console.log({existingLikeCountRecord})
            if(!existingLikeCountRecord) {
              return this.sendResponse(res, {message: "PropyKeys home listing like removed!"});
            } else {
              // update existing like count record
              await PropyKeysHomeListingLikeCountRepository.update({
                count: existingLikeCountRecord.count - 1,
              }, existingLikeCountRecord.id);
            }
            return this.sendResponse(res, {message: "PropyKeys home listing like removed!"});
          }
        } else {
          return this.sendError(res, requiredPartsCheck.message);
        }
      }
    }

    return this.sendResponse(res, {});
  }
}

export default SignatureController;