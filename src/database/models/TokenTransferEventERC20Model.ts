import { ERC20_TRANSFER_EVENT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class TokenTransferEventERC20Model extends BaseModel {
    static get tableName() {
      return ERC20_TRANSFER_EVENT_TABLE
    }

    static get idColumn() {
      return "id"
    }
}