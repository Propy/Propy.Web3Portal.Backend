const { 
  EVM_TRANSACTION_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(EVM_TRANSACTION_TABLE, table => {
  table.string("to").nullable().alter();
});

exports.down = (knex) => knex.schema.alterTable(EVM_TRANSACTION_TABLE, table => {
  table.string("to").notNullable().alter();
});