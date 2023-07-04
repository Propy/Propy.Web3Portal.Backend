const {
  BALANCE_TABLE,
  NETWORK_TABLE,
  EVM_TRANSACTION_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(EVM_TRANSACTION_TABLE, table => {
    table.increments();
    table.string("network_name")
      .index()
      .references(`${NETWORK_TABLE}.name`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("hash")
      .index()
      .unique()
      .notNullable();
    table.string("block_hash")
      .index()
      .notNullable();
    table.string("block_number")
      .index()
      .notNullable();
    table.string("block_timestamp")
      .notNullable();
    table.string("from")
      .index()
      .notNullable();
    table.string("gas")
      .notNullable();
    table.text("input")
      .nullable();
    table.string("nonce")
      .notNullable();
    table.string("r")
      .notNullable();
    table.string("s")
      .notNullable();
    table.string("to")
      .index()
      .notNullable();
    table.string("transaction_index")
      .notNullable();
    table.string("type")
      .nullable();
    table.string("v")
      .notNullable();
    table.string("value")
      .notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(EVM_TRANSACTION_TABLE);