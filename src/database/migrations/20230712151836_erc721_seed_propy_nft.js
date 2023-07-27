const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex(ASSET_TABLE).insert(
  [
    {
      address: "0x2dbC375B35c5A2B6E36A386c8006168b686b70D3",
      network_name: "ethereum",
      symbol: "pNFT",
      is_base_asset: false,
      standard: "ERC-721",
      deployment_block: "12592388",
      decimals: 0,
      name: "PropyNFT"
    },
  ]
);

exports.down = knex => knex(ASSET_TABLE).where("address", "0x2dbC375B35c5A2B6E36A386c8006168b686b70D3").delete();