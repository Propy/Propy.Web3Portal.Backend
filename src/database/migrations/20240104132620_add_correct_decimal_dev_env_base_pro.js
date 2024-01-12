const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV})

exports.up = (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(ASSET_TABLE).insert(
      [
        {
          address: "0x3660925E58444955c4812e42A572e532e69Dac7B",
          network_name: "base-sepolia",
          symbol: "PRO (Base Sepolia)",
          is_base_asset: false,
          deployment_block: "4260606",
          standard: "ERC-20",
          decimals: 8,
          name: "Propy (Base Sepolia)",
          slug: 'pro-base-sepolia',
        },
      ]
    )
  }
  return true;
};

exports.down = async (knex) => {
  await knex(ASSET_TABLE).where("address", "0x3660925E58444955c4812e42A572e532e69Dac7B").delete();
};