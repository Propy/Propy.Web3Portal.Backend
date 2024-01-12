const {
  SYNC_TRACK_TABLE,
  BASE_WITHDRAWAL_INITIATED_EVENT_TABLE,
  BASE_WITHDRAWAL_PROVEN_EVENT_TABLE,
  BASE_WITHDRAWAL_FINALIZED_EVENT_TABLE,
  BASE_DEPOSIT_BRIDGE_INITIATED_EVENT_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

exports.up = async (knex) => {
  await knex(SYNC_TRACK_TABLE).where("meta", "BaseL2StandardBridge-WithdrawalInitiated").delete();
  await knex(SYNC_TRACK_TABLE).where("meta", "OptimismPortal-WithdrawalProven").delete();
  await knex(SYNC_TRACK_TABLE).where("meta", "OptimismPortal-WithdrawalFinalized").delete();
  await knex(SYNC_TRACK_TABLE).where("meta", "L1StandardBridge-ERC20DepositInitiated").delete();
  await knex(SYNC_TRACK_TABLE).where("meta", "L1StandardBridge-ERC20BridgeInitiated").delete();
  await knex(SYNC_TRACK_TABLE).where("meta", "OptimismMintableERC20-Mint").delete();
  await knex(BASE_WITHDRAWAL_INITIATED_EVENT_TABLE).truncate();
  await knex(BASE_WITHDRAWAL_PROVEN_EVENT_TABLE).truncate();
  await knex(BASE_WITHDRAWAL_FINALIZED_EVENT_TABLE).truncate();
  await knex(BASE_DEPOSIT_BRIDGE_INITIATED_EVENT_TABLE).truncate();
  return true;
}

exports.down = knex => {
  return true;
};