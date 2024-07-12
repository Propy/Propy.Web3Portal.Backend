const {
  PROPYKEYS_HOME_LISTING_TABLE,
} = require("../tables");

exports.up = async (knex) => {
  await knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.string("propykeys_internal_listing_id").index()
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.dropColumn("propykeys_internal_listing_id");
  });
};