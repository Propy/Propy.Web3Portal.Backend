const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex(ASSET_TABLE).insert(
  [
    {
      address: "0xB5c4910335D373eb26FeBb30B8f1d7416179A4EC",
      network_name: "ethereum",
      symbol: "MAxS",
      is_base_asset: false,
      standard: "ERC-721",
      deployment_block: "15624699",
      decimals: 0,
      name: "MetaAgents"
    },
    ((APP_ENV === 'dev' || APP_ENV === 'stage') &&
      {
        address: "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95",
        network_name: "goerli",
        symbol: "pDHV2",
        is_base_asset: false,
        deployment_block: "8887962",
        standard: "ERC-721",
        decimals: 0,
        name: "PropyDeedHashedV2",
        collection_name: "Propy Certificates",
      }
    ),
  ]
);

exports.down = knex => knex(ASSET_TABLE).where("address", "0xB5c4910335D373eb26FeBb30B8f1d7416179A4EC").delete();