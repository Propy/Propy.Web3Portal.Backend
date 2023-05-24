import { SYNC_TRACK_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class SyncTrackModel extends BaseModel {
    static get tableName() {
        return SYNC_TRACK_TABLE
    }

    static get idColumn() {
        return "id"
    }
}