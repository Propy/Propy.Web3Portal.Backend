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
          address: "0xa7423583D3b0B292E093aAC2f8900396EC110960",
          network_name: "sepolia",
          symbol: "PRO (Sepolia)",
          is_base_asset: false,
          deployment_block: "4640741",
          standard: "ERC-20",
          decimals: 8,
          name: "Propy (Sepolia)",
          slug: 'pro-sepolia',
        },
        {
          address: "0x15269C6bDfe0bD1A107e1eEcF3200664D40bc042",
          network_name: "base-sepolia",
          symbol: "PRO (Base Sepolia)",
          is_base_asset: false,
          deployment_block: "3007457",
          standard: "ERC-20",
          decimals: 18,
          name: "Propy (Base Sepolia)",
          slug: 'pro-base-sepolia',
        },
      ]
    )
  }
  return true;
};

exports.down = async (knex) => {
  await knex(ASSET_TABLE).where("address", "0xa7423583D3b0B292E093aAC2f8900396EC110960").delete();
  await knex(ASSET_TABLE).where("address", "0x15269C6bDfe0bD1A107e1eEcF3200664D40bc042").delete();
};