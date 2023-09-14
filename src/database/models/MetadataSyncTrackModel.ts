import { METADATA_SYNC_TRACK_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class MetadataSyncTrackModel extends BaseModel {
    static get tableName() {
        return METADATA_SYNC_TRACK_TABLE
    }

    static get idColumn() {
        return "id"
    }
}