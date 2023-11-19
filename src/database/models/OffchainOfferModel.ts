import { 
  ASSET_TABLE,
  OFFCHAIN_OFFER_TABLE,
} from "../tables";
import BaseModel from "./BaseModel";
import AssetModel from "./AssetModel";

export default class OffchainOfferModel extends BaseModel {
    static get tableName() {
      return OFFCHAIN_OFFER_TABLE
    }

    static get idColumn() {
      return "id"
    }

    static get relationMappings() {
      return {
          offer_token: {
            relation: BaseModel.HasOneRelation,
            modelClass: AssetModel,
            join: {
                from: `${OFFCHAIN_OFFER_TABLE}.offer_token_address`,
                to: `${ASSET_TABLE}.address`,
            }
          },
      }
  }
}