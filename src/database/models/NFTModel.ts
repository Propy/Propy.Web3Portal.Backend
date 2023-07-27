import { 
  ASSET_TABLE,
  BALANCE_TABLE,
  ERC721_TRANSFER_EVENT_TABLE,
  NFT_TABLE,
} from "../tables";

import BaseModel from "./BaseModel";
import AssetModel from "./AssetModel";
import BalanceModel from "./BalanceModel";
import TokenTransferEventERC721Model from "./TokenTransferEventERC721Model";

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
      }
  }
   
}