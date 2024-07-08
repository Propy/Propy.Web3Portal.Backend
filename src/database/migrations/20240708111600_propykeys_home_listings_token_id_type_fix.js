const { PROPYKEYS_HOME_LISTING_TABLE } = require("../tables");

exports.up = function(knex) {
  return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.dropIndex('token_id');
  })
  .then(() => {
    return knex.schema.raw(`
      ALTER TABLE ${PROPYKEYS_HOME_LISTING_TABLE} 
      ALTER COLUMN token_id TYPE VARCHAR(255) USING token_id::VARCHAR(255)
    `);
  })
  .then(() => {
    return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
      table.index('token_id');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
    table.dropIndex('token_id');
  })
  .then(() => {
    return knex.schema.raw(`
      ALTER TABLE ${PROPYKEYS_HOME_LISTING_TABLE} 
      ALTER COLUMN token_id TYPE INTEGER USING token_id::INTEGER
    `);
  })
  .then(() => {
    return knex.schema.alterTable(PROPYKEYS_HOME_LISTING_TABLE, table => {
      table.index('token_id');
    });
  });
};