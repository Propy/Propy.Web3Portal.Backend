const {
  SYNC_PERFORMANCE_LOG_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(SYNC_PERFORMANCE_LOG_TABLE, table => {
  table.string("provider_mode");
}).then(async () => {
  await knex(SYNC_PERFORMANCE_LOG_TABLE)
  .select('id')
  .then(async (logs) => {
    for(let log of logs) {
      await knex(SYNC_PERFORMANCE_LOG_TABLE).update({"provider_mode": "alchemy"}).where('id', log.id);
    }
  });
}).then(() => knex.schema.alterTable(SYNC_PERFORMANCE_LOG_TABLE, table => {
  table.string("provider_mode").index().notNullable().alter();
}))

exports.down = (knex) => knex.schema.alterTable(SYNC_PERFORMANCE_LOG_TABLE, table => {
  table.dropColumn("provider_mode");
});