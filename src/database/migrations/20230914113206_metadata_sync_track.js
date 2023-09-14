const {
  METADATA_SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(METADATA_SYNC_TRACK_TABLE, table => {
    table.increments();
    table.string("name").index().unique().notNullable();
    table.string("last_sync_timestamp");
    table.boolean("in_progress").notNullable().defaultTo(false);
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(SYNC_TRACK_TABLE);