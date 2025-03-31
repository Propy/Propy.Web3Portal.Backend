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
      address: "0x1238536071E1c677A632429e3655c799b22cDA52",
      network_name: "sepolia",
      symbol: "UNI-V3-POS",
      is_base_asset: false,
      deployment_block: "7739564",
      standard: "ERC-721",
      decimals: 0,
      name: "Uniswap V3 Positions NFT-V1",
      collection_name: "Uniswap V3 Positions NFT-V1",
      slug: 'uniswap-lp-v3-1-percent-testpro-weth-sepolia',
      staking_related: true,
      uniswap_lp_asset: true,
    })
    records.push({
      address: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
      network_name: "base",
      symbol: "UNI-V3-POS",
      is_base_asset: false,
      deployment_block: "11783259",
      standard: "ERC-721",
      decimals: 0,
      name: "Uniswap V3 Positions NFT-V1",
      collection_name: "Uniswap V3 Positions NFT-V1",
      slug: 'uniswap-lp-v3-1-percent-pro-weth-base',
      staking_related: true,
      uniswap_lp_asset: true,
    })
    return knex(ASSET_TABLE).insert(records);
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x1238536071E1c677A632429e3655c799b22cDA52").orWhere("address", "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1").delete();