const { 
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.string("coingecko_id").index();
});

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("coingecko_id");
});