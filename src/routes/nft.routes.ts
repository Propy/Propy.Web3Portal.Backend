'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/nft/coordinates/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCoordinatesPaginated')

Router.get('/nft/like-count/:network/:assetAddress/:tokenId', [], 'NFTController@getNftLikeCount');

Router.get('/nft/liked-by-status/:network/:assetAddress/:tokenId/:likerAddress', [], 'NFTController@getNftLikedByStatus');

Router.get('/nft/unique-metadata-values/:network/:assetAddress/:metadataField', [], 'NFTController@getUniqueMetadataFieldValues')

Router.get('/nft/:network/:assetAddress/:tokenId', [], 'NFTController@getNftInfoWithTokenId');

Router.post('/nft/refresh-metadata', [
  body('network').notEmpty(),
  body('asset_address').notEmpty().custom(isETHAddress),
  body('token_id').notEmpty(),
], 'NFTController@refreshNftMetadata');

Router.get('/nft/recently-minted', [], 'NFTController@getRecentlyMintedPaginated');

Router.get('/nft/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCollectionPaginated')

module.exports = Router.export();