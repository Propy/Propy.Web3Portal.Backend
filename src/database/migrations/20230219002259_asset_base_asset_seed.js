const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.boolean("is_base_asset").index().defaultTo(false).notNullable();
}).then(function () {
  return knex(ASSET_TABLE).insert(
  [
    {
      address: "ETH",
      network_name: "ethereum",
      symbol: "ETH",
      is_base_asset: true,
      deployment_block: "0",
      standard: "BASE",
      decimals: 18,
      name: "Ether"
    },
    {
      address: "0x226bb599a12C826476e3A771454697EA52E9E220",
      network_name: "ethereum",
      symbol: "PRO",
      is_base_asset: false,
      deployment_block: "4032456",
      standard: "ERC-20",
      decimals: 8,
      name: "Propy"
    },
  ]);
});

exports.down = knex => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("is_base_asset");
}).then(function () {
  return knex(ASSET_TABLE).where("standard", "BASE").delete();
});;