import { ONFTReceivedEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}

class ONFTReceivedEventRepository extends BaseRepository {
    getModel() {
      return ONFTReceivedEventModel
    }

    async paginate(
      perPage = 10,
      page = 1,
      query : IPaginationQuery = {},
      transformer?: ITransformer,
    ) {
      let contractAddress = query.contractAddress ? query.contractAddress : null;
      let tokenId = query.tokenId ? query.tokenId : null;
  
      const results = await this.model.query().where(function (this: QueryBuilder<ONFTReceivedEventModel>) {
        if (contractAddress) {
          this.where('contract_address', contractAddress).orWhere('nft_address', contractAddress);
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

    async clearRecordsByContractAddressAboveOrEqualToBlockNumber(network: string, contractAddress: string, blockNumber: number) {
      return await this.model.query().where(function (this: QueryBuilder<ONFTReceivedEventModel>) {
        this.where("network_name", network);
        this.where("contract_address", contractAddress);
        this.where('block_number', ">=", blockNumber);
      }).delete();
    }

    async findEventByEventFingerprint(eventFingerprint: string) {
        
          const result = await this.model.query().where(function (this: QueryBuilder<ONFTReceivedEventModel>) {
            this.where("event_fingerprint", eventFingerprint);
          })
      
          if (result.length === 0) {
            return null;
          }
      
          return this.parserResult(result);
          
        }
}

export default new ONFTReceivedEventRepository()
