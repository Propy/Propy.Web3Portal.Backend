const { BASE_BRIDGE_CONTRACT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(BASE_BRIDGE_CONTRACT_TABLE).insert([
      {
        address: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
        network_name: "sepolia",
        deployment_block: "4370901",
        meta: "L1StandardBridge",
        events: ["ERC20BridgeInitiated"],
        enable_sync: true,
      },
    ]);
  }
  return true;
};

exports.down = async (knex) => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    await knex(BASE_BRIDGE_CONTRACT_TABLE).where("meta", "L1StandardBridge").andWhere("network_name", "sepolia").andWhere("address", "0xfd0Bf71F60660E2f608ed56e1659C450eB113120").delete();
  }
  return true;
}