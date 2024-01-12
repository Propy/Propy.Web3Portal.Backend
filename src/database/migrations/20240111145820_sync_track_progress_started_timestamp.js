const { 
  SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.string("progress_started_timestamp").nullable();
});

exports.down = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.dropColumn("progress_started_timestamp");
});