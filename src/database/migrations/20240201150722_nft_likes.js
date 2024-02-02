const { NFT_LIKE_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(NFT_LIKE_TABLE, table => {
  table.increments();
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("contract_address").index().notNullable();
  table.string("token_id").index().notNullable();
  table.string("liker_address").index().notNullable();
  table.integer("timestamp_unix").notNullable().index();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(NFT_LIKE_TABLE);