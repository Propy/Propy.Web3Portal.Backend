const { PROPYKEYS_LISTING_LIKE_TABLE, PROPYKEYS_HOME_LISTING_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(PROPYKEYS_LISTING_LIKE_TABLE, table => {
  table.increments();
  table.integer("propykeys_listing_id")
    .index()
    .references(`${PROPYKEYS_HOME_LISTING_TABLE}.id`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("liker_address").index().notNullable();
  table.integer("timestamp_unix").notNullable().index();
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(PROPYKEYS_LISTING_LIKE_TABLE);