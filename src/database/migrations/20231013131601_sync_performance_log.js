const {
  SYNC_PERFORMANCE_LOG_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(SYNC_PERFORMANCE_LOG_TABLE, table => {
    table.increments();
    table.string("name").index().notNullable();
    table.integer("sync_duration_seconds").notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(SYNC_PERFORMANCE_LOG_TABLE);