const {
  SYNC_TRACK_TABLE,
  BALANCE_TABLE,
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

exports.up = async (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    await knex(SYNC_TRACK_TABLE).where("contract_address", "0x15269C6bDfe0bD1A107e1eEcF3200664D40bc042").delete();
    await knex(BALANCE_TABLE).where("asset_address", "0x15269C6bDfe0bD1A107e1eEcF3200664D40bc042").delete();
    await knex(ASSET_TABLE).where("address", "0x15269C6bDfe0bD1A107e1eEcF3200664D40bc042").delete();
    return true;
  }
  return true;
}

exports.down = knex => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(ASSET_TABLE).insert(
      [
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
        }
      ]
    );
  }
  return true;
};