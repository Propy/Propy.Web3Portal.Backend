const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
    table.string("virtual_pro_amount_entered").nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
    table.dropColumn("virtual_pro_amount_entered");
  });
};