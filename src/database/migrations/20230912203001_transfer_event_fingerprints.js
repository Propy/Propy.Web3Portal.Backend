const {
  ERC20_TRANSFER_EVENT_TABLE,
} = require("../tables");

exports.up = (knex) => knex.schema.alterTable(ERC20_TRANSFER_EVENT_TABLE, table => {
  table.string("event_fingerprint");
}).then(async () => {
  await knex(ERC20_TRANSFER_EVENT_TABLE)
  .select('id')
  .select('network_name')
  .select('block_number')
  .select('transaction_index')
  .select('log_index')
  .then(async (events) => {
    for(let event of events) {
      let eventFingerprint = `${event.network_name}-${event.block_number}-${event.transaction_index}-${event.log_index}`;
      await knex(ERC20_TRANSFER_EVENT_TABLE).update({"event_fingerprint": eventFingerprint}).where('id', event.id);
    }
  });
}).then(() => knex.schema.alterTable(ERC20_TRANSFER_EVENT_TABLE, table => {
  table.string("event_fingerprint").index().notNullable().alter();
}))

exports.down = (knex) => knex.schema.alterTable(ERC20_TRANSFER_EVENT_TABLE, table => {
  table.dropColumn("event_fingerprint");
});