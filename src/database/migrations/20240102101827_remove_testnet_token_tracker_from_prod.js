const {
  SYNC_TRACK_TABLE,
  BALANCE_TABLE,
  NFT_TABLE,
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

exports.up = async (knex) => {
  if((APP_ENV === 'prod')) {
    await knex(SYNC_TRACK_TABLE).where("contract_address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();
    await knex(BALANCE_TABLE).where("asset_address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();
    await knex(NFT_TABLE).where("asset_address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();
    await knex(ASSET_TABLE).where("address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();
    return true;
  }
  return true;
}

exports.down = knex => {
  if((APP_ENV === 'prod')) {
    return knex(ASSET_TABLE).insert(
      [
        {
          address: "0x77932CA68a539a738d167Ec019B6aE7596766152",
          network_name: "sepolia",
          symbol: "pHomeNFT",
          is_base_asset: false,
          deployment_block: "4686999",
          standard: "ERC-721",
          decimals: 0,
          name: "Propy Home NFT",
          collection_name: "Home NFT Dev (Testnet)",
          slug: 'propy-home-nft-dev-testnet',
        },
      ]
    );
  }
  return true;
};