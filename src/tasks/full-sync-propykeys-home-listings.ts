import BigNumber from 'bignumber.js';
import axios from 'axios';
import { utils } from "ethers";

import {
  IPropyKeysListingListResponse,
  IPropyKeysListingShortResponse,
  IPropyKeysListingLongResponse,
} from '../interfaces';

import {
  debugMode,
  PROPYKEYS_API_FULL_LISTINGS_LIST,
  PROPYKEYS_API_SINGLE_LISTING_DETAILS,
} from '../constants';

import {
  sleep
} from '../utils';

import {
	createLog,
  createErrorLog
} from '../logger';

import {
  PropyKeysHomeListingRepository,
} from '../database/repositories';

const propyKeysRetryMax = 3;

export const fetchPropyKeysHomeListings = async (network: string, page = 1, pageSize = 100, retryCount = 0) => {
  let url = `${PROPYKEYS_API_FULL_LISTINGS_LIST[network]}?page=${page}&pageSize=${pageSize}`;
  let results : IPropyKeysListingListResponse = await axios.get(
    url,
    {
      headers: { "Accept-Encoding": "gzip,deflate,compress" }
    }
  )
  .then(function (response) {
    // handle success
    return response?.data ? response?.data : {};
  })
  .catch(async (e) => {
    retryCount++;
    if(retryCount < propyKeysRetryMax) {
      createErrorLog(`error fetching propykeys listings at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(10000 + Math.floor(Math.random() * 5000));
      return await fetchPropyKeysHomeListings(network, page, pageSize, retryCount);
    } else {
      createErrorLog(`retries failed, error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return {};
  })
  return results;
}

export const fetchPropyKeysHomeListingSingle = async (network: string, contractAddress: string, tokenId: number, retryCount = 0) => {
  let url = `${PROPYKEYS_API_SINGLE_LISTING_DETAILS[network]}/${contractAddress}/${tokenId}`;
  let results : IPropyKeysListingLongResponse = await axios.get(
    url,
    {
      headers: { "Accept-Encoding": "gzip,deflate,compress" }
    }
  )
  .then(function (response) {
    // handle success
    return response?.data ? response?.data : {};
  })
  .catch(async (e) => {
    retryCount++;
    if(retryCount < propyKeysRetryMax) {
      createErrorLog(`error fetching propykeys listings at ${Math.floor(new Date().getTime() / 1000)}, retry #${retryCount}...`, e);
      await sleep(10000 + Math.floor(Math.random() * 5000));
      return await fetchPropyKeysHomeListings(network, retryCount);
    } else {
      createErrorLog(`retries failed, error fetching coingecko prices at ${Math.floor(new Date().getTime() / 1000)}`, e);
    }
    return {};
  })
  return results;
}

export const fullSyncPropyKeysHomeListings = async (network: string) => {

  let listings : IPropyKeysListingShortResponse[] = [];
  let pageCurrent = 1;
  let pageSize = 100;
  let remainingRecords = 0;
  let remainingPages = 0;
  let contractAddress = "";

  // get first batch of home listings
  let firstBatch = await fetchPropyKeysHomeListings(network, pageCurrent, pageSize);

  if(firstBatch.listings) {
    listings = [...listings, ...firstBatch.listings];
  }

  if(firstBatch.contractAddress) {
    contractAddress = firstBatch.contractAddress;
  }

  if(firstBatch?.total) {
    remainingRecords = firstBatch?.total - firstBatch?.listings.length;
    remainingPages = Math.ceil(remainingRecords / pageSize);
    console.log({remainingRecords, remainingPages});
    for(let entry of Array.from({length: remainingPages})) {
      pageCurrent++;
      let nextBatch = await fetchPropyKeysHomeListings(network, pageCurrent, pageSize);
      if(nextBatch.listings) {
        listings = [...listings, ...firstBatch.listings];
      }
    }
  }

  let listingsDetailed = [];

  for(let listing of listings) {
    let listingInfo = await fetchPropyKeysHomeListingSingle(network, contractAddress, listing.tokenId);
    listingsDetailed.push(listingInfo);
  }

  for(let detailedListing of listingsDetailed) {
    await syncSinglePropyKeysHomeListing(network, contractAddress, detailedListing);
  }

}

export const syncSinglePropyKeysHomeListing = async (network: string, contractAddress: string, detailedListing: IPropyKeysListingLongResponse) => {
  // Check if a listing already exists for this token ID and contract address
  let alreadyExists = await PropyKeysHomeListingRepository.getListingByTokenIdAndAddressAndNetwork(`${detailedListing.tokenId}`, contractAddress, network)
  let listingObjectFormatted = {
    network_name: network,
    asset_address: contractAddress,
    token_id: detailedListing.tokenId,
    full_address: detailedListing.fullAddress,
    price: detailedListing.price,
    description: detailedListing.description,
    bedrooms: detailedListing.bedrooms,
    bathrooms: detailedListing.bathrooms,
    size: detailedListing.size,
    floor: detailedListing.floor,
    floors: detailedListing.floors,
    type: detailedListing.type,
    year_built: detailedListing.yearBuilt,
    lot_size: detailedListing.lotSize,
    images: detailedListing.images,
    propykeys_internal_listing_id: detailedListing.id,
  }
  if(alreadyExists) {
    await PropyKeysHomeListingRepository.update(listingObjectFormatted, alreadyExists.id);
  } else {
    await PropyKeysHomeListingRepository.create(listingObjectFormatted);
  }
}