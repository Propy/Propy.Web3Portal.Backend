const {
  ASSET_TABLE,
} = require("../tables");

exports.up = async (knex) => {
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('slug', 'propy-deed-certificates-stage-testnet');
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('collection_name', 'Propy Certificates Staging (Testnet)');
};

exports.down = async (knex) => {
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('slug', 'propy-deed-certificates-testnet');
  await knex(ASSET_TABLE).where({ address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95" }).update('collection_name', 'Propy Certificates (Testnet)');
};