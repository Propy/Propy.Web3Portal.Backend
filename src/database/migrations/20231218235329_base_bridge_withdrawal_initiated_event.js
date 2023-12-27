const { BASE_WITHDRAWAL_INITIATED_EVENT_TABLE, EVM_TRANSACTION_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(BASE_WITHDRAWAL_INITIATED_EVENT_TABLE, table => {
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
  table.string("contract_address").index().notNullable();
  table.text("data").notNullable();
  table.text("topic").notNullable();
  table.string("l1_token_address").index().notNullable();
  table.string("l2_token_address").index().notNullable();
  table.string("from").index().notNullable();
  table.string("to").index().notNullable();
  table.string("amount").notNullable();
  table.text("extra_data").notNullable();
  table.string("transaction_hash")
      .index()
      .references(`${EVM_TRANSACTION_TABLE}.hash`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
  table.integer("log_index").notNullable();
  table.string("status").index().nullable();
  table.string("withdrawal_hash").index().notNullable();
  table.string("event_fingerprint").index().unique().notNullable();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(BASE_WITHDRAWAL_INITIATED_EVENT_TABLE);