import { ONFTContractModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

class ONFTContractRepository extends BaseRepository {
    getModel() {
      return ONFTContractModel
    }

    async getSyncContracts(
      transformer?: ITransformer,
    ) {
      const result = await this.model.query().where(function (this: QueryBuilder<ONFTContractModel>) {
        this.where('enable_sync', true);
      });

      return this.parserResult(result, transformer);
    }
}

export default new ONFTContractRepository()
