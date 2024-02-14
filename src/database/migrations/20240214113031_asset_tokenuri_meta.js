const {
  ASSET_TABLE,
  SYNC_TRACK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.string("tokenuri_meta").nullable();
}).then(async () => {
  await knex(ASSET_TABLE).where({ address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).update({"tokenuri_meta": "propykeys"});
  await knex(ASSET_TABLE).where({ address: "0x3660925E58444955c4812e42A572e532e69Dac7B" }).update({"tokenuri_meta": "propykeys"});
  await knex(SYNC_TRACK_TABLE).where({ contract_address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E" }).andWhere({meta: "erc721-tokenuri-update-sync"}).delete();
  await knex(SYNC_TRACK_TABLE).where({ contract_address: "0x3660925E58444955c4812e42A572e532e69Dac7B" }).andWhere({meta: "erc721-tokenuri-update-sync"}).delete();
})

exports.down = (knex) => knex.schema.alterTable(ASSET_TABLE, table => {
  table.dropColumn("tokenuri_meta");
})