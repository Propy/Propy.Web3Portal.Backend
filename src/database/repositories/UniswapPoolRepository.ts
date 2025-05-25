import { QueryBuilder } from "objection";

import { UniswapPoolModel } from "../models";
import BaseRepository from "./BaseRepository";
import { ITransformer } from "../../interfaces";

class UniswapPoolRepository extends BaseRepository {
  getModel() {
    return UniswapPoolModel
  }

  async getSyncContracts(transformer?: ITransformer) {
    const result = await this.model.query()
    .where(function (this: QueryBuilder<UniswapPoolModel>) {
      this.where('enable_sync', true);
    })

    return this.parserResult(result, transformer);
  }
}

export default new UniswapPoolRepository()