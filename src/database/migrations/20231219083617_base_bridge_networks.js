const { NETWORK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(NETWORK_TABLE, table => {
    return true;
}).then(function () {
  return knex(NETWORK_TABLE).insert([
    {
      name: "base",
    },
  ]);
});

exports.down = knex => knex(NETWORK_TABLE).where("name", "base").delete();