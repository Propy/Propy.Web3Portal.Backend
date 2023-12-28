const { 
  OFFCHAIN_OFFER_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(OFFCHAIN_OFFER_TABLE, async (table) => {
  await knex(OFFCHAIN_OFFER_TABLE).truncate();
}).then(() => knex.schema.alterTable(OFFCHAIN_OFFER_TABLE, table => {
  table.integer("timestamp_unix").notNullable().index();
}))

exports.down = (knex) => knex.schema.alterTable(OFFCHAIN_OFFER_TABLE, table => {
  table.dropColumn("timestamp_unix");
});