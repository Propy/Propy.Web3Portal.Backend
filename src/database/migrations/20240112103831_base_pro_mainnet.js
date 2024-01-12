const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV})

exports.up = (knex) => {
  return knex(ASSET_TABLE).insert(
    [
      {
        address: "0x18dD5B087bCA9920562aFf7A0199b96B9230438b",
        network_name: "base",
        symbol: "PRO",
        is_base_asset: false,
        deployment_block: "9132920",
        standard: "ERC-20",
        decimals: 8,
        name: "Propy",
        slug: 'pro-base',
      },
    ]
  )
};

exports.down = async (knex) => {
  await knex(ASSET_TABLE).where("address", "0x18dD5B087bCA9920562aFf7A0199b96B9230438b").delete();
};