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

  async clearRecordsByContractAddressAboveOrEqualToBlockNumber(contractAddress: string, blockNumber: number) {
    return await this.model.query().where(function (this: QueryBuilder<TokenTransferEventERC20Model>) {
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }
}

export default new TokenTransferEventERC20Repository()
