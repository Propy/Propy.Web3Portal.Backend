const { 
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.string("name").index().notNullable();
  table.string("collection_name").index().nullable();
  table.text("collection_description").nullable();
});

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("name");
});