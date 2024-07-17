import { BaseWithdrawalInitiatedEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

import BaseDepositBridgeInitiatedEventModel from '../models/BaseDepositBridgeInitiatedEventModel';

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}
class BaseWithdrawalInitiatedEventRepository extends BaseRepository {
  getModel() {
    return BaseWithdrawalInitiatedEventModel
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let contractAddress = query.contractAddress ? query.contractAddress : null;

    const results = await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalInitiatedEventModel>) {
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

    const result = await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalInitiatedEventModel>) {
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
    return await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalInitiatedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }

  async fetchAllWithdrawalInitiatedEvents(
    network: string,
    contractAddress: string,
    l1TokenAddress: string,
    l2TokenAddress: string,
    from: string,
    to: string,
    transformer?: ITransformer,
  ) {
    const results =  await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalInitiatedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where("l1_token_address", l1TokenAddress);
      this.where("l2_token_address", l2TokenAddress);
      this.where("from", from);
      this.where("to", to);
    })
    .withGraphFetched('[evm_transaction, withdrawal_proven_event, withdrawal_finalized_event]')

    return this.parserResult(results, transformer);
  }

  async fetchAllWithdrawalInitiatedEventsByTransactionHash(
    network: string,
    contractAddress: string,
    transactionHash: string,
    transformer?: ITransformer,
  ) {
    const results =  await this.model.query().where(function (this: QueryBuilder<BaseWithdrawalInitiatedEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where("transaction_hash", transactionHash);
    })
    .withGraphFetched('[evm_transaction, withdrawal_proven_event.[evm_transaction], withdrawal_finalized_event]')
    .first()

    return this.parserResult(results, transformer);
  }
  
}

export default new BaseWithdrawalInitiatedEventRepository()
