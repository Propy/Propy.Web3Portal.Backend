const { NFT_STAKING_STATUS_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(NFT_STAKING_STATUS_TABLE, table => {
  table.increments();
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("contract_address").index().notNullable();
  table.string("token_id").index().notNullable();
  table.string("last_staking_address").index().notNullable();
  table.boolean("staking_status").index().notNullable();
  table.decimal("block_number_of_last_update", 18, 0).notNullable();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(NFT_STAKING_STATUS_TABLE);