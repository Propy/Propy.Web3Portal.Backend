const { STAKING_EVENT_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
    table.string("token_id").nullable().alter();
  }).then(async () => {
    return await knex(SYNC_TRACK_TABLE).where({ meta: "PRONFTStakingV3_PRO-EnteredStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861" }).orWhere({ meta: "PRONFTStakingV3_PRO-LeftStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861" }).orWhere({meta: "PRONFTStakingV3_PRO-EarlyLeftStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861"}).delete();
  })
};

exports.down = async (knex) => {
  await (async () => {
    return await knex(SYNC_TRACK_TABLE).where({ meta: "PRONFTStakingV3_PRO-EnteredStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861" }).orWhere({ meta: "PRONFTStakingV3_PRO-LeftStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861" }).orWhere({meta: "PRONFTStakingV3_PRO-EarlyLeftStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861"}).delete();
  })
  await (async () => {
    return await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
      table.string("token_id").notNullable().alter();
    });
  })
};