const { 
  USER_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(USER_TABLE, table => {
  table.increments();
  table.string("address").index().unique().notNullable();
  table.integer("nonce").defaultTo(0),
  table.string("salt").notNullable(),
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(USER_TABLE);