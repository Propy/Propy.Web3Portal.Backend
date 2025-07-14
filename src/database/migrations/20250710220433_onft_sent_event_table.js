const { ONFT_SENT_EVENT_TABLE, EVM_TRANSACTION_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(ONFT_SENT_EVENT_TABLE, table => {
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
  table.string("onft_address").index().notNullable();
  table.string("nft_address").index().notNullable();
  table.string("source_nft_address").index().notNullable();
  table.string("source_nft_network_name").index()
  .references(`${NETWORK_TABLE}.name`)
  .onUpdate('CASCADE')
  .onDelete('CASCADE')
  .notNullable();
  table.string("dst_eid").index().notNullable();
  table.string("token_id").index().notNullable();
  table.string("from_address").index().notNullable();
  table.string("guid").index().notNullable();
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

exports.down = knex => knex.schema.dropTable(ONFT_SENT_EVENT_TABLE);