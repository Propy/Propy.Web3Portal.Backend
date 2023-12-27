const { 
  NFT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  // TODO 
  // install PostGIS and migrate these crude coordinates to PostGIS datatypes
  table.decimal("longitude", 10, 6).nullable();
  table.decimal("latitude", 10, 6).nullable();
});

exports.down = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.dropColumn("longitude");
  table.dropColumn("latitude");
});