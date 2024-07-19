const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  return true;
}).then(async () => {
  return await knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update({"name": "PropyKeys Addresses", "collection_name": "PropyKeys Addresses"});
})

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  return knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update({"name": "PropyKeys", "collection_name": "PropyKeys"});
})