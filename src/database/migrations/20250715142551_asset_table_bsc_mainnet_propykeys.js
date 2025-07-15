const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  let records = [];
  records.push({
    address: "0x2671F689317F636baCB92594342e19Cdd163833e",
    network_name: "bnb-mainnet",
    symbol: "pKEY",
    is_base_asset: false,
    deployment_block: "54122559",
    standard: "ERC-721",
    decimals: 0,
    name: "PropyKeys (BNB)",
    collection_name: "PropyKeys (BNB)",
    slug: 'propykeys-bnb-mainnet',
    staking_related: false,
  })
  return knex(ASSET_TABLE).insert(records);
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x2671F689317F636baCB92594342e19Cdd163833e").delete();