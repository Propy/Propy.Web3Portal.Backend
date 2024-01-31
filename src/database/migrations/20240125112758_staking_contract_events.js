const { STAKING_EVENT_TABLE, EVM_TRANSACTION_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(STAKING_EVENT_TABLE, table => {
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
  // our own identifier
  table.string("type").index().notNullable();
  // event-specific
  table.string("staker").index().notNullable();
  table.string("token_address").index().notNullable();
  table.string("token_id").index().notNullable();
  table.string("pro_amount_entered").nullable();
  table.string("staking_power_issued").nullable();
  table.string("pro_amount_with_reward").nullable();
  table.string("staking_power_burnt").nullable();
  // event-specific
  table.string("transaction_hash")
      .index()
      .references(`${EVM_TRANSACTION_TABLE}.hash`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
  table.integer("log_index").notNullable();
  table.string("event_fingerprint").index().unique().notNullable();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(STAKING_EVENT_TABLE);