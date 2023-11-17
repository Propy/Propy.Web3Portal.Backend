const { 
  OFFCHAIN_OFFER_TABLE,
  USER_TABLE,
  ASSET_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(OFFCHAIN_OFFER_TABLE, table => {
  table.increments();
  table.string("user_address")
      .index()
      .references(`${USER_TABLE}.address`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
  table.string("asset_address")
    .index()
    .references(`${ASSET_TABLE}.address`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("token_id")
    .index()
    .notNullable();
  table.string("offer_token_address")
    .index()
    .references(`${ASSET_TABLE}.address`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("offer_token_amount").notNullable();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(OFFCHAIN_OFFER_TABLE);