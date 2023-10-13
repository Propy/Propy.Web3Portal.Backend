const {
  SYSTEM_REPORT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(SYSTEM_REPORT_TABLE, table => {
    table.increments();
    table.string("name").index().unique().notNullable();
    table.text("data").nullable();
    table.string("last_report_timestamp");
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(SYSTEM_REPORT_TABLE);