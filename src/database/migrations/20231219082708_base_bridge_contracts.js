const { BASE_BRIDGE_CONTRACT_TABLE, NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.createTable(BASE_BRIDGE_CONTRACT_TABLE, table => {
  table.increments();
  table.string("address").index().notNullable();
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("deployment_block").notNullable();
  table.string("meta").index();
  table.boolean("enable_sync").defaultTo(true);
  table.specificType("events", 'character varying(40)[]');
  table.timestamps(true, true);
});

exports.down = knex => knex.schema.dropTable(BASE_BRIDGE_CONTRACT_TABLE);