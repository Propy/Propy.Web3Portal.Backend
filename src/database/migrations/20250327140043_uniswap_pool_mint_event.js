const { UNISWAP_POOL_MINT_EVENT_TABLE, UNISWAP_POOL_TABLE, NETWORK_TABLE, EVM_TRANSACTION_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.createTable(UNISWAP_POOL_MINT_EVENT_TABLE, table => {
  table.increments();
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.decimal("block_number", 18, 0).notNullable()
  table.string("block_hash").notNullable();
  table.integer("transaction_index").notNullable();
  table.boolean("removed").notNullable();
  table.string("pool_address")
  .index()
  .references(`${UNISWAP_POOL_TABLE}.pool_address`)
  .onUpdate('CASCADE')
  .onDelete('CASCADE')
  .notNullable();
  table.text("data").notNullable();
  table.text("topic").notNullable();
  // event-specific below
  table.string("sender").index().notNullable();
  table.string("owner").index().notNullable();
  table.string("tick_lower").notNullable();
  table.string("tick_upper").notNullable();
  table.string("amount").notNullable();
  table.string("amount0").notNullable();
  table.string("amount1").notNullable();
  // event-specific above
  // custom shim below
  table.string("position_nft_address").index().notNullable();
  table.string("token_id").index().notNullable();
  // custom shim above
  table.string("transaction_hash")
      .index()
      .references(`${EVM_TRANSACTION_TABLE}.hash`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
  table.integer("log_index").notNullable();
  table.string("event_fingerprint").index().unique().notNullable();
  table.timestamps(true, true);
})

exports.down = knex => knex.schema.dropTable(UNISWAP_POOL_MINT_EVENT_TABLE);