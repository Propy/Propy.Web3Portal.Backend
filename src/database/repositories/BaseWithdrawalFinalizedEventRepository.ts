import { BaseWithdrawalFinalizedEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}
class BaseWithdrawalFinalizedEventRepository extends BaseRepository {
  getModel() {
    return BaseWithdrawalFinalizedEventModel
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let contractAddress = query.contractAddress ? query.contractAddress : null;

    const results = await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalFinalizedEventModel>) {
      if (contractAddress) {
        this.where('contract_address', contractAddress);
      }
    })
    .withGraphFetched('[evm_transaction]')
    .orderBy('block_number', 'DESC')
    .page(page - 1, perPage)

    return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async findEventByEventFingerprint(eventFingerprint: string) {

    const result = await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalFinalizedEventModel>) {
      this.where("event_fingerprint", eventFingerprint);
    })

    if (result.length === 0) {
      return null;
    }

    return this.parserResult(result);
    
  }

  async clearRecordsByContractAddress(contractAddress: string) {
    return await this.model.query().where("contract_address", contractAddress).delete();
  }

  async clearRecordsByContractAddressAboveOrEqualToBlockNumber(network: string, contractAddress: string, blockNumber: number) {
    return await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalFinalizedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }


}

export default new BaseWithdrawalFinalizedEventRepository()
