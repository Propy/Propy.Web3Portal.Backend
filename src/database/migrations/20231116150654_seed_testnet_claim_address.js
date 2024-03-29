const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

exports.up = (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
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
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();