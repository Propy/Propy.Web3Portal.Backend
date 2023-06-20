import { ASSET_TABLE, BALANCE_TABLE } from "../tables";
import BaseModel from "./BaseModel";
import BalanceModel from "./BalanceModel";

export default class AssetModel extends BaseModel {
    static get tableName() {
        return ASSET_TABLE
    }

    static get idColumn() {
        return "id"
    }

    static get relationMappings() {
        return {
            balance: {
                relation: BaseModel.HasOneRelation,
                modelClass: BalanceModel,
                join: {
                    from: `${ASSET_TABLE}.address`,
                    to: `${BALANCE_TABLE}.asset_address`,
                }
            },
        }
    }
}