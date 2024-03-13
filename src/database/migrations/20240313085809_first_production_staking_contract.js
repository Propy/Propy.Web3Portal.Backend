const { STAKING_CONTRACT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
    return true;
}).then(function () {
  return knex(STAKING_CONTRACT_TABLE).insert([
    {
      address: "0xcFEc6c0F4eCd951ecac87e2Ab5BE22449c9faf8B",
      network_name: "base",
      deployment_block: "11736086",
      meta: "PRONFTStaking",
      events: ["EnteredStaking", "LeftStaking"],
      enable_sync: true,
    },
  ]);
})

exports.down = knex => knex(STAKING_CONTRACT_TABLE).where("meta", "PRONFTStaking").andWhere("address", "0xcFEc6c0F4eCd951ecac87e2Ab5BE22449c9faf8B").andWhere("network_name", "base").delete();