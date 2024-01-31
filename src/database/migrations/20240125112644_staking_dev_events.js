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
        address: "0x781C1fa24Bb50c8DD84fEF095ae836E7f0Ba384D",
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

exports.down = knex => knex(STAKING_CONTRACT_TABLE).where("meta", "PRONFTStaking").andWhere("address", "0x781C1fa24Bb50c8DD84fEF095ae836E7f0Ba384D").andWhere("network_name", "base-sepolia").delete();