const { NETWORK_TABLE } = require("../tables");

exports.up = (knex) => knex.schema.alterTable(NETWORK_TABLE, table => {
    return true;
}).then(function () {
    return knex(NETWORK_TABLE).insert([
      {
        name: "sepolia",
      },
    ]);
});

exports.down = knex => knex(NETWORK_TABLE).where("name", "sepolia").delete();