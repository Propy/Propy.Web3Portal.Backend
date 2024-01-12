import { BaseDepositBridgeInitiatedEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}
class BaseDepositBridgeInitiatedEventRepository extends BaseRepository {
  getModel() {
    return BaseDepositBridgeInitiatedEventModel
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let contractAddress = query.contractAddress ? query.contractAddress : null;

    const results = await this.model.query().where(function (this: QueryBuilder<BaseDepositBridgeInitiatedEventModel>) {
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

    const result = await this.model.query().where(function (this: QueryBuilder<BaseDepositBridgeInitiatedEventModel>) {
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
    return await this.model.query().where(function (this: QueryBuilder<BaseDepositBridgeInitiatedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }

  async fetchAllDepositBridgeInitiatedEvents(
    network: string,
    contractAddress: string,
    l1TokenAddress: string,
    l2TokenAddress: string,
    from: string,
    to: string,
    transformer?: ITransformer,
  ) {
    const results =  await this.model.query().where(function (this: QueryBuilder<BaseDepositBridgeInitiatedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where("l1_token_address", l1TokenAddress);
      this.where("l2_token_address", l2TokenAddress);
      this.where("from", from);
      this.where("to", to);
    })
    .withGraphFetched('[evm_transaction]')

    return this.parserResult(results, transformer);
  }

}

export default new BaseDepositBridgeInitiatedEventRepository()
