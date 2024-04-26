const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(STAKING_CONTRACT_TABLE).insert(
      {
        address: "0x74aa08EeE3a819D18B580a57F7B37a9dfb07730D",
        deployment_block: "9138790",
        meta: "PRONFTStakingV2",
        network_name: "base-sepolia",
        events: ["EnteredStaking", "LeftStaking"],
        enable_sync: true,
      },
    )
  }
  return true;
})

exports.down = knex => {
  return true;
};