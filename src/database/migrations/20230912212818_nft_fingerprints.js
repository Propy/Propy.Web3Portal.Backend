const {
  NFT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.string("nft_fingerprint");
}).then(async () => {
  await knex(NFT_TABLE)
  .select('id')
  .select('network_name')
  .select('asset_address')
  .select('token_id')
  .then(async (nfts) => {
    for(let nft of nfts) {
      let nftFingerprint = `${nft.network_name}-${nft.asset_address}-${nft.token_id}`;
      await knex(NFT_TABLE).update({"nft_fingerprint": nftFingerprint}).where('id', nft.id);
    }
  });
}).then(() => knex.schema.alterTable(NFT_TABLE, table => {
  table.string("nft_fingerprint").index().unique().notNullable().alter();
}))

exports.down = (knex) => knex.schema.alterTable(NFT_TABLE, table => {
  table.dropColumn("nft_fingerprint");
});