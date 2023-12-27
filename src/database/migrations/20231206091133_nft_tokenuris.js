const { 
  NFT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.string("token_uri").nullable();
});

exports.down = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.dropColumn("token_uri");
});