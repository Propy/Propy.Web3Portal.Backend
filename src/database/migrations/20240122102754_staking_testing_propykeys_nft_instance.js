const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

const BASE_SEPOLIA_ADDRESS = "0x07922CDe9e58fb590ffB59BB8777cF4b737fE2a3";

exports.up = (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(ASSET_TABLE).insert(
      [
        {
          address: BASE_SEPOLIA_ADDRESS,
          network_name: "base-sepolia",
          symbol: "pKEYStaking",
          is_base_asset: false,
          deployment_block: "5075161",
          standard: "ERC-721",
          decimals: 0,
          name: "PropyKeys Staking Sepolia",
          collection_name: "PropyKeysStakingSepolia",
          slug: 'propykeys-staking-sepolia',
        },
      ]
    );
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", BASE_SEPOLIA_ADDRESS).delete();