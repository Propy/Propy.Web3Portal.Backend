const { 
  NFT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.text("metadata").nullable();
});

exports.down = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.dropColumn("metadata");
});