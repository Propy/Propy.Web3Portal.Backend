const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const BASE_PROPY_OG_ADDRESS = "0xc84F3b80847B224684b11bF956d46c7028bC1906";

exports.up = (knex) => {
  return knex(ASSET_TABLE).insert(
    [
      {
        address: BASE_PROPY_OG_ADDRESS,
        network_name: "base",
        symbol: "pOG",
        is_base_asset: false,
        deployment_block: "11728683",
        standard: "ERC-721",
        decimals: 0,
        name: "PropyOG",
        collection_name: "PropyOG",
        slug: 'propy-og',
        staking_related: true,
      },
    ]
  );
}

exports.down = knex => knex(ASSET_TABLE).where("address", BASE_PROPY_OG_ADDRESS).delete();