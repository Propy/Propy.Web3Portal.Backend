// Update with your config settings.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  client: "pg",
  connection: {
      host: process.env["DB_HOST"],
      port: process.env["DB_PORT"],
      user: process.env["DB_USER"],
      password: process.env["DB_PASS"],
      database: process.env["DB_NAME"],
  },
  migrations: {
      tableName: 'migrations',
      directory: 'src/database/migrations',
  }
};
