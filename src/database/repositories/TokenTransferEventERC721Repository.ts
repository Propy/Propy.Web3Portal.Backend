import { TokenTransferEventERC721Model } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}
class TokenTransferEventERC721Repository extends BaseRepository {
  getModel() {
    return TokenTransferEventERC721Model
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let contractAddress = query.contractAddress ? query.contractAddress : null;
    let tokenId = query.tokenId ? query.tokenId : null;

    const results = await this.model.query().where(function (this: QueryBuilder<TokenTransferEventERC721Model>) {
      if (contractAddress) {
        this.where('contract_address', contractAddress);
      }
      if (tokenId) {
        this.where('token_id', tokenId);
      }
    })
    .withGraphFetched('[evm_transaction]')
    .orderBy('block_number', 'DESC')
    .page(page - 1, perPage)

    return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async findEventByNetworkAndBlockNumberAndTxIndexAndLogIndex(network: string, blockNumber: string, txIndex: string, logIndex: string) {

    const result = await this.model.query().where(function (this: QueryBuilder<TokenTransferEventERC721Model>) {
      this.where("network_name", network);
      this.where('block_number', blockNumber);
      this.where('transaction_index', txIndex);
      this.where('log_index', logIndex);
    })

    if (result.length === 0) {
      return null;
    }

    return this.parserResult(result);
    
  }

  async clearRecordsByContractAddress(contractAddress: string) {
    return await this.model.query().where("contract_address", contractAddress).delete();
  }

  async clearRecordsByContractAddressAboveOrEqualToBlockNumber(contractAddress: string, blockNumber: number) {
    return await this.model.query().where(function (this: QueryBuilder<TokenTransferEventERC721Model>) {
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
    }).delete();
  }


}

export default new TokenTransferEventERC721Repository()
