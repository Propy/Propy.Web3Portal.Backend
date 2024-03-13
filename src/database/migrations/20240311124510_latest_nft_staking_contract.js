const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(SYNC_TRACK_TABLE).where("contract_address", "0x3504Bf24Ff9fC43b41628153742907C9fb20ccA1").delete();
  }
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(NFT_STAKING_STATUS_TABLE).truncate();
  }
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(STAKING_EVENT_TABLE).truncate();
  }
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(STAKING_CONTRACT_TABLE).update(
      {
        address: "0x89b36952ad798fFDE2CBe825ade5ed94f2d53905",
        deployment_block: "7196841"
      },
    ).where("meta", "PRONFTStaking").andWhere("address", "0x3504Bf24Ff9fC43b41628153742907C9fb20ccA1").andWhere("network_name", "base-sepolia");
  }
  return true;
})

exports.down = knex => {
  return true;
};