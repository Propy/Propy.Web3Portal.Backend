const { BASE_BRIDGE_CONTRACT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.alterTable(BASE_BRIDGE_CONTRACT_TABLE, table => {
    return true;
}).then(function () {
  return knex(BASE_BRIDGE_CONTRACT_TABLE).insert([
    {
      address: "0x4200000000000000000000000000000000000010",
      network_name: "base",
      deployment_block: "0",
      meta: "BaseL2StandardBridge",
      events: ["WithdrawalInitiated"],
      enable_sync: true,
    },
    {
      address: "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e",
      network_name: "ethereum",
      deployment_block: "17482143",
      meta: "OptimismPortal",
      events: ["WithdrawalProven", "WithdrawalFinalized"],
      enable_sync: true,
    },
  ]);
}).then(function () {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return knex(BASE_BRIDGE_CONTRACT_TABLE).insert([
      {
        address: "0x4200000000000000000000000000000000000010",
        network_name: "base-sepolia",
        deployment_block: "0",
        meta: "BaseL2StandardBridge",
        events: ["WithdrawalInitiated"],
        enable_sync: true,
      },
      {
        address: "0x49f53e41452C74589E85cA1677426Ba426459e85",
        network_name: "sepolia",
        deployment_block: "4370901",
        meta: "OptimismPortal",
        events: ["WithdrawalProven", "WithdrawalFinalized"],
        enable_sync: true,
      },
    ]);
  }
  return true;
})

exports.down = knex => knex(BASE_BRIDGE_CONTRACT_TABLE).where("meta", "BaseL2StandardBridge").orWhere("meta", "OptimismPortal").delete();