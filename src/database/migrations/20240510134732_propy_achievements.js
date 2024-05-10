const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

const BASE_SEPOLIA_PROPY_KEY_ACHIEVEMENTS_ADDRESS = "0x738A333b7B0372A4975622Dc27D5F319fE7Ed633";
const BASE_PROPY_KEY_ACHIEVEMENTS_ADDRESS = "0x879930eFe4d073cbbA1b84727601CAd2AA1Ac7b8";

exports.up = (knex) => {
  let records = [
    {
      address: BASE_PROPY_KEY_ACHIEVEMENTS_ADDRESS,
      network_name: "base",
      symbol: "pKeyAchievements",
      is_base_asset: false,
      deployment_block: "14269196",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyKey Achievements",
      collection_name: "PropyKey Achievements",
      slug: 'propykey-achievements',
      staking_related: false,
    },
  ];
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    records.push({
      address: BASE_SEPOLIA_PROPY_KEY_ACHIEVEMENTS_ADDRESS,
      network_name: "base-sepolia",
      symbol: "pKeyAchievements",
      is_base_asset: false,
      deployment_block: "9779595",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyKey Achievements (Testnet)",
      collection_name: "PropyKey Achievements (Testnet)",
      slug: 'propykey-achievements-testnet',
      staking_related: false,
    })
  }
  return knex(ASSET_TABLE).insert(records);
}

exports.down = knex => knex(ASSET_TABLE).where("address", BASE_PROPY_KEY_ACHIEVEMENTS_ADDRESS).orWhere("address", BASE_SEPOLIA_PROPY_KEY_ACHIEVEMENTS_ADDRESS).delete();