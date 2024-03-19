import { GenericCacheModel } from "../models";
import BaseRepository from "./BaseRepository";

class GenericCacheRepository extends BaseRepository {
  getModel() {
    return GenericCacheModel
  }
}

export default new GenericCacheRepository()