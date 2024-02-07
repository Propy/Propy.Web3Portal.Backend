const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.boolean("staking_related").index().defaultTo(false);
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0x4ebCEb82B5940E10c301A33261Af13222A38d974" }).update('staking_related', true);
  await knex(ASSET_TABLE).where({ address: "0x07922CDe9e58fb590ffB59BB8777cF4b737fE2a3" }).update('staking_related', true);
  await knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update('staking_related', true);
});

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("staking_related");
});