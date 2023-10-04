const { 
  SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.string("latest_block_timestamp").notNullable().defaultTo(0);
});

exports.down = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.dropColumn("latest_block_timestamp");
});