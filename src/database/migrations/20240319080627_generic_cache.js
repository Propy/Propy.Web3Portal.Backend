const { GENERIC_CACHE_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(GENERIC_CACHE_TABLE, table => {
  table.increments();
  table.string("key").unique().index()
  table.string("update_timestamp").notNullable();
  table.integer("max_seconds_age")
  table.jsonb('json');
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(GENERIC_CACHE_TABLE);