const {
  ACCOUNT_TABLE,
  BALANCE_TABLE,
  ASSET_TABLE,
  NETWORK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(BALANCE_TABLE, table => {
    table.increments();
    table.string("network_name")
      .index()
      .references(`${NETWORK_TABLE}.name`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("asset_address")
      .index()
      .references(`${ASSET_TABLE}.address`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("holder_address")
      .index()
      .notNullable();
    table.string("token_id")
      .index()
      .nullable();
    table.decimal("balance", 78, 0)
      .notNullable()
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(BALANCE_TABLE);