const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex(ASSET_TABLE).insert(
  [
    {
      address: "0x567c407D054A644DBBBf2d3a6643776473f82d7a",
      network_name: "arbitrum",
      symbol: "pDHV2",
      is_base_asset: false,
      deployment_block: "130352872",
      standard: "ERC-721",
      decimals: 0,
      name: "PropyDeedHashedV2",
      collection_name: "Propy Certificates",
      slug: 'propy-certificates',
    },
  ]
);

exports.down = knex => knex(ASSET_TABLE).where("address", "0x567c407D054A644DBBBf2d3a6643776473f82d7a").delete();