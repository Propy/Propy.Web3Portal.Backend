'use strict';

import { body } from 'express-validator';

import {
  isETHAddress,
} from "../web3/utils";

import Router from "./Router";

Router.get('/nft/coordinates/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCoordinates')

Router.get('/nft/coordinates-postgis-clusters/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCoordinatesPostGISClusters')

Router.get('/nft/coordinates-postgis-points/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCoordinatesPostGISPoints')

Router.get('/nft/like-count/:network/:assetAddress/:tokenId', [], 'NFTController@getNftLikeCount');

Router.get('/nft/liked-by-status/:network/:assetAddress/:tokenId/:likerAddress', [], 'NFTController@getNftLikedByStatus');

Router.get('/nft/unique-metadata-values/:network/:contractNameOrCollectionNameOrAddress/:metadataField', [], 'NFTController@getUniqueMetadataFieldValues')

Router.get('/nft/unique-metadata-values-with-listing/:network/:contractNameOrCollectionNameOrAddress/:metadataField', [], 'NFTController@getUniqueMetadataFieldValuesWithListings')

Router.get('/nft/:network/:assetAddress/:tokenId', [], 'NFTController@getNftInfoWithTokenId');

Router.post('/nft/refresh-metadata', [
  body('network').notEmpty(),
  body('asset_address').notEmpty().custom(isETHAddress),
  body('token_id').notEmpty(),
], 'NFTController@refreshNftMetadata');

Router.get('/nft/recently-minted', [], 'NFTController@getRecentlyMintedPaginated');

Router.get('/nft/:network/:contractNameOrCollectionNameOrAddress', [], 'NFTController@getCollectionPaginated')

module.exports = Router.export();