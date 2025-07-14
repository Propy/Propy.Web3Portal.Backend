import { 
  ASSET_TABLE,
  BALANCE_TABLE,
  ERC721_TRANSFER_EVENT_TABLE,
  NFT_TABLE,
  OFFCHAIN_OFFER_TABLE,
  PROPYKEYS_HOME_LISTING_TABLE,
  NFT_LIKE_COUNT_TABLE,
  ONFT_RECEIVED_EVENT_TABLE,
  ONFT_SENT_EVENT_TABLE,
} from "../tables";

import BaseModel from "./BaseModel";
import AssetModel from "./AssetModel";
import BalanceModel from "./BalanceModel";
import OffchainOfferModel from "./OffchainOfferModel";
import TokenTransferEventERC721Model from "./TokenTransferEventERC721Model";
import ONFTReceivedEventModel from "./ONFTReceivedEventModel";
import ONFTSentEventModel from "./ONFTSentEventModel";
import PropyKeysHomeListingModel from "./PropyKeysHomeListingModel";
import NFTLikeCountModel from "./NFTLikeCountModel";

export default class NFTModel extends BaseModel {
    static get tableName() {
        return NFT_TABLE
    }

    static get idColumn() {
        return "id"
    }

    static get relationMappings() {
      return {
          asset: {
            relation: BaseModel.HasOneRelation,
            modelClass: AssetModel,
            join: {
                from: `${NFT_TABLE}.asset_address`,
                to: `${ASSET_TABLE}.address`,
            }
          },
          balances: {
              relation: BaseModel.HasManyRelation,
              modelClass: BalanceModel,
              join: {
                  from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                  to: [`${BALANCE_TABLE}.asset_address`, `${BALANCE_TABLE}.token_id`],
              }
          },
          transfer_events_erc721: {
              relation: BaseModel.HasManyRelation,
              modelClass: TokenTransferEventERC721Model,
              join: {
                  from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                  to: [`${ERC721_TRANSFER_EVENT_TABLE}.contract_address`, `${ERC721_TRANSFER_EVENT_TABLE}.token_id`],
              }
          },
          onft_received_events: {
            relation: BaseModel.HasManyRelation,
            modelClass: ONFTReceivedEventModel,
            join: {
                from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                to: [`${ONFT_RECEIVED_EVENT_TABLE}.contract_address`, `${ONFT_RECEIVED_EVENT_TABLE}.token_id`],
            }
          },
          onft_sent_events: {
            relation: BaseModel.HasManyRelation,
            modelClass: ONFTSentEventModel,
            join: {
                from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                to: [`${ONFT_SENT_EVENT_TABLE}.contract_address`, `${ONFT_SENT_EVENT_TABLE}.token_id`],
            }
          },
          offchain_offers: {
            relation: BaseModel.HasManyRelation,
            modelClass: OffchainOfferModel,
            join: {
                from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                to: [`${OFFCHAIN_OFFER_TABLE}.asset_address`, `${OFFCHAIN_OFFER_TABLE}.token_id`],
            }
          },
          propykeys_home_listing: {
            relation: BaseModel.HasOneRelation,
            modelClass: PropyKeysHomeListingModel,
            join: {
                from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                to: [`${PROPYKEYS_HOME_LISTING_TABLE}.asset_address`, `${PROPYKEYS_HOME_LISTING_TABLE}.token_id`],
            }
          },
          likes: {
            relation: BaseModel.HasOneRelation,
            modelClass: NFTLikeCountModel,
            join: {
                from: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
                to: [`${NFT_LIKE_COUNT_TABLE}.contract_address`, `${NFT_LIKE_COUNT_TABLE}.token_id`],
            }
          },
      }
  }
   
}