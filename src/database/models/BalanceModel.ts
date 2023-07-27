import { BALANCE_TABLE, ASSET_TABLE, NFT_TABLE } from "../tables";
import BaseModel from "./BaseModel";
import AssetModel from "./AssetModel";
import NFTModel from './NFTModel';

export default class BalanceModel extends BaseModel {
    static get tableName() {
        return BALANCE_TABLE
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
              from: `${BALANCE_TABLE}.asset_address`,
              to: `${ASSET_TABLE}.address`,
          }
        },
        nft: {
          relation: BaseModel.HasOneRelation,
          modelClass: NFTModel,
          join: {
              from: [`${BALANCE_TABLE}.asset_address`, `${BALANCE_TABLE}.token_id`],
              to: [`${NFT_TABLE}.asset_address`, `${NFT_TABLE}.token_id`],
          }
        },
      }
    }
}