import { AdminModel } from "../models";
import BaseRepository from "./BaseRepository";

class AdminRepository extends BaseRepository {
  getModel() {
    return AdminModel
  }
}

export default new AdminRepository()