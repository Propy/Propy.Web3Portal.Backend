const { STAKING_EVENT_TABLE, SYNC_TRACK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  return await knex(SYNC_TRACK_TABLE).where({ meta: "PRONFTStakingV3_PRO-LeftStakingERC20-0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861" }).delete();
};

exports.down = async (knex) => {
  return true;
};