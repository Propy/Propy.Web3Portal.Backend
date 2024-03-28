const {
  METADATA_SYNC_TRACK_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  await knex(METADATA_SYNC_TRACK_TABLE).where("name", "erc721-sync").update({in_progress: false});
  return true;
}

exports.down = knex => {
  return true;
};