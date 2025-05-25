const { UNISWAP_POOL_TABLE, NETWORK_TABLE, BALANCE_TABLE, NFT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.createTable(UNISWAP_POOL_TABLE, table => {
  table.increments();
  table.string("pool_address").index().unique().notNullable();
  table.string("position_nft_address").index().notNullable();
  table.string("meta").index();
  table.boolean("enable_sync").defaultTo(true);
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.specificType("events", 'character varying(40)[]');
  table.string("deployment_block").notNullable();
  table.timestamps(true, true);
}).then(async () => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    // testnet config
    return await knex(UNISWAP_POOL_TABLE).insert([
      { 
        pool_address: "0x5c6d85c26144443dF76bd8639F4a3A7E684BD7C4",
        position_nft_address: "0x1238536071E1c677A632429e3655c799b22cDA52",
        network_name: "sepolia",
        events: ["Mint"],
        deployment_block: "7739564",
        enable_sync: true,
        meta: "v3-1%-TESTPRO-WETH"
      },
      { 
        pool_address: "0xb0e962D88daE312F030771D19868EB4901E0F709",
        position_nft_address: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
        network_name: "base",
        events: ["Mint"],
        deployment_block: "11783259",
        enable_sync: true,
        meta: "v3-1%-PRO-WETH"
      }
    ]);
  } else {
    // production config
    return await knex(UNISWAP_POOL_TABLE).insert([
      { 
        pool_address: "0xb0e962D88daE312F030771D19868EB4901E0F709",
        position_nft_address: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
        network_name: "base",
        events: ["Mint"],
        deployment_block: "11783259",
        enable_sync: true,
        meta: "v3-1%-PRO-WETH"
      }
    ]);
  }
});

exports.down = knex => knex.schema.dropTable(UNISWAP_POOL_TABLE).then(function () {
  return knex(BALANCE_TABLE).where("asset_address", "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1").delete();
}).then(function () {
  return knex(BALANCE_TABLE).where("asset_address", "0x1238536071E1c677A632429e3655c799b22cDA52").delete();
}).then(function () {
  return knex(NFT_TABLE).where("asset_address", "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1").delete();
}).then(function () {
  return knex(NFT_TABLE).where("asset_address", "0x1238536071E1c677A632429e3655c799b22cDA52").delete();
})