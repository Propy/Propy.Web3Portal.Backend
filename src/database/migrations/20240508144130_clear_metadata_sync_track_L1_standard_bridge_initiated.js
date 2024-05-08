const {
  SYNC_TRACK_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV});

exports.up = async (knex) => {
  if(APP_ENV === 'prod') {
    await knex(SYNC_TRACK_TABLE).where("meta", "L1StandardBridge-ERC20BridgeInitiated").update({in_progress: false});
  }
  return true;
}

exports.down = knex => {
  return true;
};