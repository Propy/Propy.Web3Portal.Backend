const {
  ASSET_TABLE,
} = require("../tables");

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
  ]
);

exports.down = knex => knex(ASSET_TABLE).where("address", "0xB5c4910335D373eb26FeBb30B8f1d7416179A4EC").delete();