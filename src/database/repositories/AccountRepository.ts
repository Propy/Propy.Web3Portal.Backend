import { AccountModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class AccountRepository extends BaseRepository {
  getModel() {
    return AccountModel
  }

  async getAccountByAddress(address: string) {
    const result = await this.model.query().where(function (this: QueryBuilder<AccountModel>) {
      this.where('address', address);
    }).first();

    return this.parserResult(result);
  }

  async getAccounts() {
   
    const results = await this.model.query();

    return this.parserResult(results);
    
  }

  async getActiveAccounts() {
    const result = await this.model.query().where(function (this: QueryBuilder<AccountModel>) {
      this.where('enabled', true);
    });

    return this.parserResult(result);
  }
}

export default new AccountRepository()
