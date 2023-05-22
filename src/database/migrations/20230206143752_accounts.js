const { ACCOUNT_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(ACCOUNT_TABLE, table => {
    table.increments();
    table.string("address").index().unique().notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(ACCOUNT_TABLE);