import { Model } from "objection";
import Knex from "knex";
import dbConfig from "../config/database";

// DB
const knex = Knex(dbConfig);
Model.knex(knex);

export default Model;