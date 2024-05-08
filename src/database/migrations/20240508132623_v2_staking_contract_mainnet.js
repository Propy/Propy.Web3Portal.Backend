const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  return knex(STAKING_CONTRACT_TABLE).insert(
    {
      address: "0x3A8CF059f6e0cbBFD248621cECa69053FA5fB7D4",
      deployment_block: "14192220",
      meta: "PRONFTStakingV2",
      network_name: "base",
      events: ["EnteredStaking", "LeftStaking"],
      enable_sync: true,
    },
  )
})

exports.down = knex => {
  return true;
};