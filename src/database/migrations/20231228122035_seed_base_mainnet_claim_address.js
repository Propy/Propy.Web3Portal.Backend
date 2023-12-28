const {
  ASSET_TABLE,
} = require("../tables");

const MAINNET_ADDRESS = "0x567c407D054A644DBBBf2d3a6643776473f82d7a";

exports.up = (knex) => {
  return knex(ASSET_TABLE).insert(
    [
      {
        address: MAINNET_ADDRESS,
        network_name: "base",
        symbol: "pKEY",
        is_base_asset: false,
        deployment_block: "8493172",
        standard: "ERC-721",
        decimals: 0,
        name: "PropyKeys",
        collection_name: "PropyKeys",
        slug: 'propykeys',
      },
    ]
  );
}

exports.down = knex => knex(ASSET_TABLE).where("address", MAINNET_ADDRESS).delete();