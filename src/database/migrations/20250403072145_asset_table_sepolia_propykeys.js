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
      address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
      network_name: "sepolia",
      symbol: "pKEY",
      is_base_asset: false,
      deployment_block: "8034750",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyKeys (Sepolia)",
      collection_name: "PropyKeys (Sepolia)",
      slug: 'propykeys-sepolia',
      staking_related: true,
    })
    records.push({
      address: "0x2f24fFED8f7032F9032CFdBCb2CBAAB56c4fFb36",
      network_name: "sepolia",
      symbol: "pOG",
      is_base_asset: false,
      deployment_block: "8034776",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyOG (Sepolia)",
      collection_name: "PropyOG (Sepolia)",
      slug: 'propyog-sepolia',
      staking_related: true,
    })
    return knex(ASSET_TABLE).insert(records);
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x1238536071E1c677A632429e3655c799b22cDA52").orWhere("address", "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1").delete();