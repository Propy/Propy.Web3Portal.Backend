const {
  ERC20_TRANSFER_EVENT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ERC20_TRANSFER_EVENT_TABLE, table => {
  table.string("event_fingerprint").unique().notNullable().alter();
})

exports.down = (knex) => knex.schema.alterTable(ERC20_TRANSFER_EVENT_TABLE, table => {
  table.string("event_fingerprint").notNullable().alter();
});