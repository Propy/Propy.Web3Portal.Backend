import { USER_TABLE } from "../tables";

import BaseModel from "./BaseModel";

export default class UserModel extends BaseModel {
    static get tableName() {
        return USER_TABLE
    }

    static get idColumn() {
        return "id"
    }
}