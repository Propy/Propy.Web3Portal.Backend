const { ERC721_TRANSFER_EVENT_TABLE, NETWORK_TABLE, EVM_TRANSACTION_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(ERC721_TRANSFER_EVENT_TABLE, table => {
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
    table.string("data").notNullable();
    table.text("topic").notNullable();
    table.string("from").index().notNullable();
    table.string("to").index().notNullable();
    table.string("token_id").notNullable();
    table.string("transaction_hash")
        .index()
        .references(`${EVM_TRANSACTION_TABLE}.hash`)
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
        .notNullable();
    table.integer("log_index").notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(ERC721_TRANSFER_EVENT_TABLE);