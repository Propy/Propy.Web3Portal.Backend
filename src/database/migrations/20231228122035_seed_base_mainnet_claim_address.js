const {
  ASSET_TABLE,
} = require("../tables");

const MAINNET_ADDRESS = "0xa239b9b3E00637F29f6c7C416ac95127290b950E";

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