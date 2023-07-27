const { 
  BALANCE_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(BALANCE_TABLE, table => {
  table.dropColumn("metadata");
});

exports.down = (knex) => knex.schema.alterTable(BALANCE_TABLE, table => {
  table.text("metadata").nullable();
});