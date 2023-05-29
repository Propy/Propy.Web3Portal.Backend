const { 
    ASSET_TABLE,
    NETWORK_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(ASSET_TABLE, table => {
    table.increments();
    table.string("address").index().unique().notNullable();
    table.string("network_name")
        .index()
        .references(`${NETWORK_TABLE}.name`)
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
        .nullable();
    table.string("deployment_block").notNullable();
    table.string("symbol").index().notNullable();
    table.string("standard").index().notNullable();
    table.string("decimals").notNullable();
    table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(ASSET_TABLE);