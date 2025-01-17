const { PROPYKEYS_HOME_LISTING_TABLE } = require("../tables");

exports.up = function(knex) {
  return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.integer("floors").nullable().alter();
  })
};

exports.down = function(knex) {
  return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.integer("floors").notNullable().alter();
  })
};