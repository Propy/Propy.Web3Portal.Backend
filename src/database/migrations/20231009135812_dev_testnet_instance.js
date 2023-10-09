const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex(ASSET_TABLE).insert(
  [
    ((APP_ENV === 'dev' || APP_ENV === 'stage') &&
      {
        address: "0x73C3a1437B0307732Eb086cb2032552eBea15444",
        network_name: "goerli",
        symbol: "pDHV2",
        is_base_asset: false,
        deployment_block: "9561320",
        standard: "ERC-721",
        decimals: 0,
        name: "PropyDeedHashedV2",
        slug: "propy-deed-certificates-dev-testnet",
        collection_name: "Propy Certificates Dev (Testnet)",
      }
    ),
  ].filter(Boolean)
);

exports.down = knex => knex(ASSET_TABLE).where("address", "0x73C3a1437B0307732Eb086cb2032552eBea15444").delete();