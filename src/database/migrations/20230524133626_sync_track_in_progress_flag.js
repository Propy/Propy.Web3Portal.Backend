const { 
  SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.boolean("in_progress").notNullable().defaultTo(false);
});

exports.down = (knex) => knex.schema.alterTable(SYNC_TRACK_TABLE, table => {
  table.dropColumn("in_progress");
});