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
          address: "0x45C395851c9BfBd3b7313B35E6Ee460D461d585c",
          network_name: "base-sepolia",
          symbol: "pHomeNFT",
          is_base_asset: false,
          deployment_block: "3008499",
          standard: "ERC-721",
          decimals: 0,
          name: "Propy Home NFT",
          collection_name: "Mint an Address NFT (Base Sepolia)",
          slug: 'propy-home-nft-dev-base-testnet',
        },
      ]
    );
  }
  return true;
}

exports.down = knex => knex(ASSET_TABLE).where("address", "0x45C395851c9BfBd3b7313B35E6Ee460D461d585c").delete();