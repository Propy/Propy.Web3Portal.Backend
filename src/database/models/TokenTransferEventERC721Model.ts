import { ERC721_TRANSFER_EVENT_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class TokenTransferEventERC721Model extends BaseModel {
    static get tableName() {
      return ERC721_TRANSFER_EVENT_TABLE
    }

    static get idColumn() {
      return "id"
    }
}