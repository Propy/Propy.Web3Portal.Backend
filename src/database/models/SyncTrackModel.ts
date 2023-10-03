import { SYNC_TRACK_TABLE, ASSET_TABLE } from "../tables";

import BaseModel from "./BaseModel";
import AssetModel from "./AssetModel";

export default class SyncTrackModel extends BaseModel {
    static get tableName() {
        return SYNC_TRACK_TABLE
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
                  from: `${SYNC_TRACK_TABLE}.contract_address`,
                  to: `${ASSET_TABLE}.address`,
              }
            },
        }
    }
}