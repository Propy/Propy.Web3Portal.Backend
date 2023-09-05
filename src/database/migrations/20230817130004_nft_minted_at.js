const { 
  NFT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.string("mint_timestamp").notNullable();
});

exports.down = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.dropColumn("mint_timestamp");
});