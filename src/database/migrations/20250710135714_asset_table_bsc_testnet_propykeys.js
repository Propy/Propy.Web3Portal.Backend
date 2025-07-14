const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  let records = [];
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    records.push({
      address: "0x7Cfd0233200Ce507F3c8aDC8340f98c07C4aB94a",
      network_name: "bnb-testnet",
      symbol: "pKEY",
      is_base_asset: false,
      deployment_block: "57075730",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyKeys (BNB Testnet)",
      collection_name: "PropyKeys (BNB Testnet)",
      slug: 'propykeys-bnb-testnet',
      staking_related: false,
    })
    return knex(ASSET_TABLE).insert(records);
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x7Cfd0233200Ce507F3c8aDC8340f98c07C4aB94a").delete();