const {
  NETWORK_TABLE,
  ASSET_TABLE,
  PROPYKEYS_HOME_LISTING_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
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
    table.integer("token_id").index().notNullable();
    table.string("full_address").notNullable();
    table.decimal("price", 12, 2).notNullable();
    table.text("description").nullable();
    table.integer("bedrooms").notNullable();
    table.integer("bathrooms").notNullable();
    table.integer("size").notNullable();
    table.integer("floor").notNullable();
    table.integer("floors").notNullable();
    table.string("type").notNullable();
    table.integer("year_built").notNullable();
    table.integer("lot_size").notNullable();
    table.specificType("images", "text[]").notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(PROPYKEYS_HOME_LISTING_TABLE);