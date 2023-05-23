import { TokenTransferEventERC20Model } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class TokenTransferEventERC20Repository extends BaseRepository {
  getModel() {
    return TokenTransferEventERC20Model
  }

  async clearRecordsByContractAddress(contractAddress: string) {
    return await this.model.query().where("contract_address", contractAddress).delete();
  }
}

export default new TokenTransferEventERC20Repository()
