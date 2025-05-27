const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  if((APP_ENV === 'prod')) {
    return knex(STAKING_CONTRACT_TABLE).insert([
      {
        address: "0xBd0969813733df8f506611c204EEF540770CAB72",
        deployment_block: "30777368",
        meta: "PRONFTStakingV3_PK",
        network_name: "base",
        events: ["EnteredStakingPropyKeys", "LeftStakingPropyKeys", "EarlyLeftStakingPropyKeys"],
        enable_sync: true,
      },
      {
        address: "0xF46464ad108B1CC7866DF2Cfa87688F7742BA623",
        deployment_block: "30777368",
        meta: "PRONFTStakingV3_PRO",
        network_name: "base",
        events: ["EnteredStakingERC20", "LeftStakingERC20", "EarlyLeftStakingERC20"],
        enable_sync: true,
      },
      {
        address: "0x8D020131832D8823846232031bD7EEee7A102F2F",
        deployment_block: "30777368",
        meta: "PRONFTStakingV3_LP",
        network_name: "base",
        events: ["EnteredStakingLP", "LeftStakingLP", "EarlyLeftStakingLP"],
        enable_sync: true,
      },
    ])
  }
  return true;
})

exports.down = knex => knex(STAKING_CONTRACT_TABLE).where("meta", "PRONFTStakingV3_LP").orWhere("meta", "PRONFTStakingV3_PRO").orWhere("meta", "PRONFTStakingV3_PK").andWhere("network_name", "sepolia").delete();