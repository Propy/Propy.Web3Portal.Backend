import { ACCOUNT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class AccountModel extends BaseModel {
    static get tableName() {
        return ACCOUNT_TABLE
    }

    static get idColumn() {
        return "id"
    }
}