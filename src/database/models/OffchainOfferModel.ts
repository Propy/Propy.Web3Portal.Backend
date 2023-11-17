import { OFFCHAIN_OFFER_TABLE } from "../tables";
import BaseModel from "./BaseModel";

export default class OffchainOfferModel extends BaseModel {
    static get tableName() {
      return OFFCHAIN_OFFER_TABLE
    }

    static get idColumn() {
      return "id"
    }
}