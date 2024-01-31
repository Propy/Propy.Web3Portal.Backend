const { BASE_BRIDGE_CONTRACT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => {
  return knex(BASE_BRIDGE_CONTRACT_TABLE).insert([
    {
      address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35",
      network_name: "ethereum",
      deployment_block: "17482143",
      meta: "L1StandardBridge",
      events: ["ERC20BridgeInitiated"],
      enable_sync: true,
    },
  ]);
};

exports.down = (knex) => {
  return knex(BASE_BRIDGE_CONTRACT_TABLE).where("meta", "L1StandardBridge").andWhere("network_name", "ethereum").andWhere("address", "0x3154Cf16ccdb4C6d922629664174b904d80F2C35").delete();
}