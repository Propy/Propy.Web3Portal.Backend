const {
  ADMIN_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.createTable(ADMIN_TABLE, table => {
    table.increments();
    table.string("password_bcrypt_hash").notNullable();
    table.string("username").notNullable();
    table.timestamps(true, true);
}).then(function () {
  return knex(ADMIN_TABLE).insert([
    {
      username: "admin",
      password_bcrypt_hash: "$2b$10$pGCakWo/qqb579kNd4ixQePUxMBYMDr2JMm3oYfxMT7iYU2SYjenu",
    },
  ]);
});

exports.down = knex => knex.schema.dropTable(ADMIN_TABLE);