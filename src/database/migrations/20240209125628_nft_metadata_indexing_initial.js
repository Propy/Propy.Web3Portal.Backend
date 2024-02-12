const { 
  NFT_TABLE,
} = require("../tables");

exports.up = function(knex) {
  return knex.schema.alterTable(NFT_TABLE, table => {
    table.jsonb('metadata').alter();
  }).then(() => {
    return knex.raw('CREATE INDEX idx_jsonb_general_metadata ON nft USING gin (metadata)');
  })
};

exports.down = function(knex) {
  return knex.schema.alterTable(NFT_TABLE, table => {
    table.dropIndex(['metadata'], 'idx_jsonb_general_metadata');
  }).then(() => {
    knex.schema.alterTable(NFT_TABLE, table => {
      table.text('metadata').alter();
    })
  })
};