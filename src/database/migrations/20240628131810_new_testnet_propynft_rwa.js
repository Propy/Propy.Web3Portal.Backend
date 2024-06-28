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
      address: "0xDF4C5FFef580bAE01F68e578C5f062360381c7e9",
      network_name: "sepolia",
      symbol: "PropyNFT",
      is_base_asset: false,
      deployment_block: "6205148",
      standard: "ERC-721",
      decimals: 0,
      name: "Real World Assets (Sepolia)",
      collection_name: "Real World Assets (Sepolia)",
      slug: 'propy-real-world-assets-sepolia',
      staking_related: false,
    })
    return knex(ASSET_TABLE).insert(records);
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0xDF4C5FFef580bAE01F68e578C5f062360381c7e9").delete();