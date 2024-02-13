const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  return true;
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update('monitor_token_uri_updates', true);
  await knex(ASSET_TABLE).where({ address: "0x3660925E58444955c4812e42A572e532e69Dac7B" }).update('monitor_token_uri_updates', true);
})

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  return true;
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update('monitor_token_uri_updates', false);
  await knex(ASSET_TABLE).where({ address: "0x3660925E58444955c4812e42A572e532e69Dac7B" }).update('monitor_token_uri_updates', false);
})