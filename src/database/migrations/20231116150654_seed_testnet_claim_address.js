const {
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex(ASSET_TABLE).insert(
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

exports.down = knex => knex(ASSET_TABLE).where("address", "0x77932CA68a539a738d167Ec019B6aE7596766152").delete();