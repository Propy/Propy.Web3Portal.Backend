const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.string("slug");
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0xB5c4910335D373eb26FeBb30B8f1d7416179A4EC" }).update('slug', 'meta-agents');
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('slug', 'propy-certificates-testnet');
  await knex(ASSET_TABLE).where({ address: "0x2dbC375B35c5A2B6E36A386c8006168b686b70D3" }).update('slug', 'propy-nft');
  await knex(ASSET_TABLE).where({ address: "0x226bb599a12C826476e3A771454697EA52E9E220" }).update('slug', 'pro');
  return knex(ASSET_TABLE).where({ address: "ETH" }).update('slug', 'ether');
}).then(() => knex.schema.alterTable(ASSET_TABLE, table => {
  table.string("slug").index().notNullable().alter();
}))

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("slug");
});