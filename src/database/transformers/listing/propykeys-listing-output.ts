import BaseTransformer from '../BaseTransformer';

import { IPropyKeysHomeListingRecordDB, INFTRecord } from "../../../interfaces";

class PropyKeysHomeListingOutputTransformer extends BaseTransformer {
  transform(
    listingEntry: IPropyKeysHomeListingRecordDB,
    nftRecord?: INFTRecord,
  ) {
    if(listingEntry) {
      let transformedValue = {
        id: listingEntry.id,
        network_name: listingEntry.network_name,
        asset_address: listingEntry.asset_address,
        token_id: listingEntry.token_id,
        full_address: listingEntry.full_address,
        price: listingEntry.price,
        description: listingEntry.description,
        bedrooms: listingEntry.bedrooms,
        bathrooms: listingEntry.bathrooms,
        size: listingEntry.size,
        floor: listingEntry.floor,
        floors: listingEntry.floors,
        type: listingEntry.type,
        year_built: listingEntry.year_built,
        lot_size: listingEntry.lot_size,
        images: listingEntry.images,
        propykeys_internal_listing_id: listingEntry.propykeys_internal_listing_id,
        collection_name: listingEntry.collection_name,
        ...(nftRecord ? { nft: nftRecord } : {}),
      };
      if(transformedValue.nft?.propykeys_home_listing) {
        const { propykeys_home_listing, ...nftWithoutListing } = transformedValue.nft;
        transformedValue = { ...transformedValue, nft: nftWithoutListing };
      }
      return transformedValue;
    } else {
      return {}
    }
  }
}

export default new PropyKeysHomeListingOutputTransformer();