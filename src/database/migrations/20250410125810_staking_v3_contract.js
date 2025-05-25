const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(STAKING_CONTRACT_TABLE).insert([
      {
        address: "0x4021bdaF50500DD718beB929769C6eD296796c63",
        deployment_block: "8234817",
        meta: "PRONFTStakingV3_PK",
        network_name: "sepolia",
        events: ["EnteredStakingPropyKeys", "LeftStakingPropyKeys", "EarlyLeftStakingPropyKeys"],
        enable_sync: true,
      },
      {
        address: "0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861",
        deployment_block: "8234817",
        meta: "PRONFTStakingV3_PRO",
        network_name: "sepolia",
        events: ["EnteredStakingERC20", "LeftStakingERC20", "EarlyLeftStakingERC20"],
        enable_sync: true,
      },
      {
        address: "0x9dc3d771b5633850C5D10c86a47ADDD36a8B4487",
        deployment_block: "8234817",
        meta: "PRONFTStakingV3_LP",
        network_name: "sepolia",
        events: ["EnteredStakingLP", "LeftStakingLP", "EarlyLeftStakingLP"],
        enable_sync: true,
      },
    ])
  }
  return true;
})

exports.down = knex => knex(STAKING_CONTRACT_TABLE).where("meta", "PRONFTStakingV3_LP").orWhere("meta", "PRONFTStakingV3_PRO").orWhere("meta", "PRONFTStakingV3_PK").andWhere("network_name", "sepolia").delete();