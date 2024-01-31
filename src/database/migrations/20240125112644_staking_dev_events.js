const { STAKING_CONTRACT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
    return true;
}).then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(STAKING_CONTRACT_TABLE).insert([
      {
        address: "0x5Faacd053317D53EE6a82Bf69858b1FCA7235050",
        network_name: "base-sepolia",
        deployment_block: "5167660",
        meta: "PRONFTStaking",
        events: ["EnteredStaking", "LeftStaking"],
        enable_sync: true,
      },
    ]);
  }
  return true;
})

exports.down = knex => knex(STAKING_CONTRACT_TABLE).where("meta", "PRONFTStaking").andWhere("address", "0x5Faacd053317D53EE6a82Bf69858b1FCA7235050").andWhere("network_name", "base-sepolia").delete();