const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => {
  let records = [];
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    records.push({
      address: "0xD35bfA22a8E9e4BE8fE4b684be86F76C47bcC874",
      network_name: "sepolia",
      symbol: "pDHV2Sepolia",
      is_base_asset: false,
      deployment_block: "6126288",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyDeedHashedV2Sepolia",
      collection_name: "Propy Certificates (Sepolia)",
      slug: 'propy-deed-certificates-sepolia',
      staking_related: false,
    })
    return knex(ASSET_TABLE).insert(records);
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0xD35bfA22a8E9e4BE8fE4b684be86F76C47bcC874").delete();