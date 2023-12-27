const {
  ASSET_TABLE,
} = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

console.log({APP_ENV})

exports.up = (knex) => {
  return true;
}

exports.down = knex => true;