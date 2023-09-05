import { ADMIN_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class AdminModel extends BaseModel {
    static get tableName() {
        return ADMIN_TABLE
    }

    static get idColumn() {
        return "id"
    }
}