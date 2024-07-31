import { PROPYKEYS_HOME_LISTING_TABLE, PROPYKEYS_LISTING_LIKE_COUNT_TABLE, NFT_TABLE } from "../tables";

import NFTModel from "./NFTModel";
import PropyKeysHomeListingLikeCountModel from "./PropyKeysHomeListingLikeCountModel";
import BaseModel from "./BaseModel";

export default class PropyKeysHomeListingModel extends BaseModel {
    static get tableName() {
      return PROPYKEYS_HOME_LISTING_TABLE
    }

    static get idColumn() {
      return "id"
    }

    static get relationMappings() {
      return {
          nft: {
            relation: BaseModel.HasOneRelation,
            modelClass: NFTModel,
            join: {
                from: [`${PROPYKEYS_HOME_LISTING_TABLE}.asset_address`, `${PROPYKEYS_HOME_LISTING_TABLE}.token_id`],
                to: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
            }
          },
          likes: {
            relation: BaseModel.HasOneRelation,
            modelClass: PropyKeysHomeListingLikeCountModel,
            join: {
                from: [`${PROPYKEYS_HOME_LISTING_TABLE}.id`,],
                to: [`${PROPYKEYS_LISTING_LIKE_COUNT_TABLE}.propykeys_listing_id`],
            }
          },
      }
    }
}