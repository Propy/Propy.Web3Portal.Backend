const { ERC20_TRANSFER_EVENT_TABLE, ACCOUNT_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(ERC20_TRANSFER_EVENT_TABLE, table => {
    table.increments();
    table.string("account_address")
      .index()
      .references(`${ACCOUNT_TABLE}.address`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("network").index().notNullable()
    table.decimal("block_number", 18, 0).notNullable()
    table.string("block_hash").notNullable();
    table.integer("transaction_index").notNullable();
    table.boolean("removed").notNullable();
    table.string("contract_address").index().notNullable();
    table.string("data").notNullable();
    table.string("topic").notNullable();
    table.string("from").index().notNullable();
    table.string("to").index().notNullable();
    table.string("value").notNullable();
    table.string("transaction_hash").notNullable();
    table.integer("log_index").notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(ERC20_TRANSFER_EVENT_TABLE);