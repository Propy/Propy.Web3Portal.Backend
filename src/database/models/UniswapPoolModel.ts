import { UNISWAP_POOL_TABLE, UNISWAP_POOL_MINT_EVENT_TABLE } from "../tables";
import UniswapPoolMintEventModel from './UniswapPoolMintEventModel';
import BaseModel from "./BaseModel";

export default class UniswapPoolModel extends BaseModel {
    static get tableName() {
      return UNISWAP_POOL_TABLE
    }

    static get idColumn() {
      return "id"
    }

    static get relationMappings() {
      return {
        uniswap_pool_mint_event: {
          relation: BaseModel.HasManyRelation,
          modelClass: UniswapPoolMintEventModel,
          join: {
              from: `${UNISWAP_POOL_TABLE}.pool_address`,
              to: `${UNISWAP_POOL_MINT_EVENT_TABLE}.pool_address`,
          }
        }
      }
    }
}