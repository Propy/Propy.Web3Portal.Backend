const {
  NFT_METADATA_TABLE,
  ASSET_TABLE,
  NETWORK_TABLE,
} = require("../tables");

exports.up = knex => knex.schema.dropTable(NFT_METADATA_TABLE);

exports.down = (knex) => knex.schema.createTable(NFT_METADATA_TABLE, table => {
    table.increments();
    table.string("network_name")
      .index()
      .references(`${NETWORK_TABLE}.name`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("asset_address")
      .index()
      .references(`${ASSET_TABLE}.address`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .notNullable();
    table.string("token_id")
      .index()
      .notNullable();
    table.text("metadata").nullable();
    table.timestamps(true, true);
});