const { STAKING_CONTRACT_TABLE, STAKING_EVENT_TABLE, NFT_STAKING_STATUS_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(STAKING_CONTRACT_TABLE, table => {
  return true;
})
.then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(SYNC_TRACK_TABLE).where("contract_address", "0x781C1fa24Bb50c8DD84fEF095ae836E7f0Ba384D").delete();
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
        address: "0x81C640cAf33DB36691EF75A8cB88754E373Fab81",
        deployment_block: "5720006"
      },
    ).where("meta", "PRONFTStaking").andWhere("address", "0x781C1fa24Bb50c8DD84fEF095ae836E7f0Ba384D").andWhere("network_name", "base-sepolia");
  }
  return true;
})

exports.down = knex => {
  return true;
};