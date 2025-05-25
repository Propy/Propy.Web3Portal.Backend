const { STAKING_EVENT_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
    table.string("staking_module").index().nullable();
  }).then(async () => {
    return await knex(STAKING_EVENT_TABLE).where({ type: "EnteredStakingLP" }).orWhere({type: "LeftStakingLP"}).orWhere({type: "EarlyLeftStakingLP"}).update({"staking_module": "lp"});
  }).then(async () => {
    return await knex(STAKING_EVENT_TABLE).where({ type: "EnteredStakingPropyKeys" }).orWhere({type: "LeftStakingPropyKeys"}).orWhere({type: "EarlyLeftStakingPropyKeys"}).update({"staking_module": "pk"});
  }).then(async () => {
    return await knex(STAKING_EVENT_TABLE).where({ type: "EnteredStakingERC20" }).orWhere({type: "LeftStakingERC20"}).orWhere({type: "EarlyLeftStakingERC20"}).update({"staking_module": "erc20"});
  })
};

exports.down = async (knex) => {
  await knex.schema.alterTable(STAKING_EVENT_TABLE, table => {
    table.dropColumn("staking_module");
  });
};