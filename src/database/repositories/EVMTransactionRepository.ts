import { EVMTransactionModel } from "../models";
import BaseRepository from "./BaseRepository";

class EVMTransactionRepository extends BaseRepository {
  getModel() {
    return EVMTransactionModel
  }
}

export default new EVMTransactionRepository()