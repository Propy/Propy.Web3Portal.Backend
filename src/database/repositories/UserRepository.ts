import { UserModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";

class UserRepository extends BaseRepository {
  getModel() {
    return UserModel
  }
}

export default new UserRepository()