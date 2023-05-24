const {
  SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(SYNC_TRACK_TABLE, table => {
    table.increments();
    table.string("contract_address")
      .index()
      .nullable();
    table
      .string("latest_block_synced")
      .index();
    table
      .string("meta")
      .index();
    table
      .string("network")
      .index();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(SYNC_TRACK_TABLE);