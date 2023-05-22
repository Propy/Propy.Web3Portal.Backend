import { ASSET_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class AssetModel extends BaseModel {
    static get tableName() {
        return ASSET_TABLE
    }

    static get idColumn() {
        return "id"
    }
}