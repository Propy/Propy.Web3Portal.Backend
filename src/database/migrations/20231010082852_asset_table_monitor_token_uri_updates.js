const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.boolean('monitor_token_uri_updates').defaultTo(false);
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('monitor_token_uri_updates', true);
  await knex(ASSET_TABLE).where({ address: "0x73C3a1437B0307732Eb086cb2032552eBea15444" }).update('monitor_token_uri_updates', true);
  await knex(ASSET_TABLE).where({ address: "0x567c407D054A644DBBBf2d3a6643776473f82d7a" }).update('monitor_token_uri_updates', true);
})

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("monitor_token_uri_updates");
});