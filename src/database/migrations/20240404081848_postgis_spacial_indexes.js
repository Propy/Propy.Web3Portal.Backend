const { NFT_TABLE } = require("../tables");

exports.up = async (knex) => {
  await knex.raw('CREATE INDEX idx_nft_longitude_postgis ON nft USING GIST (longitude_postgis)');
  await knex.raw('CREATE INDEX idx_nft_latitude_postgis ON nft USING GIST (latitude_postgis)');
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX idx_nft_longitude_postgis');
  await knex.raw('DROP INDEX idx_nft_latitude_postgis');
};