const { ONFT_CONTRACT_TABLE, NETWORK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = (knex) => knex.schema.createTable(ONFT_CONTRACT_TABLE, table => {
  table.increments();
  table.string("onft_address").index().unique().notNullable();
  table.string("nft_address").index().unique().notNullable();
  table.string("source_nft_address").index().notNullable();
  table.string("meta").index();
  table.boolean("enable_sync").defaultTo(true);
  table.string("network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.string("source_nft_network_name")
    .index()
    .references(`${NETWORK_TABLE}.name`)
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    .notNullable();
  table.specificType("events", 'character varying(40)[]');
  table.string("deployment_block").notNullable();
  table.timestamps(true, true);
}).then(async () => {
  if((APP_ENV === 'dev' || APP_ENV === 'stage')) {
    return await knex(ONFT_CONTRACT_TABLE).insert([
      { 
        onft_address: "0x40c466eB2De16f4d59D51E3C049B480232996109",
        nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
        network_name: "sepolia",
        source_nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
        source_nft_network_name: "sepolia",
        events: ["ONFTSent", "ONFTReceived"],
        deployment_block: "8734141",
        enable_sync: true,
        meta: "ONFTAdapter"
      },
      { 
        onft_address: "0x7Cfd0233200Ce507F3c8aDC8340f98c07C4aB94a",
        nft_address: "0x7Cfd0233200Ce507F3c8aDC8340f98c07C4aB94a",
        network_name: "bnb-testnet",
        source_nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
        source_nft_network_name: "sepolia",
        events: ["ONFTSent", "ONFTReceived"],
        deployment_block: "57768688",
        enable_sync: true,
        meta: "ONFT"
      },
    ]);
  }
  if((APP_ENV === 'prod')) {
    // TODO add prod config once available
    // return await knex(ONFT_CONTRACT_TABLE).insert([
    //   { 
    //     onft_address: "0x9e12c0583b7F2957904083FE5beD508f483Accd3",
    //     nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
    //     network_name: "sepolia",
    //     source_nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
    //     source_nft_network_name: "sepolia",
    //     events: ["ONFTSent", "ONFTReceived"],
    //     deployment_block: "8683962",
    //     enable_sync: true,
    //     meta: "ONFTAdapter"
    //   },
    //   { 
    //     onft_address: "0x45C395851c9BfBd3b7313B35E6Ee460D461d585c",
    //     nft_address: "0x45C395851c9BfBd3b7313B35E6Ee460D461d585c",
    //     network_name: "bnb-testnet",
    //     source_nft_address: "0xDC695bE7440689D8B8BbF8bFF1323727A0EE231C",
    //     source_nft_network_name: "sepolia",
    //     events: ["ONFTSent", "ONFTReceived"],
    //     deployment_block: "57075730",
    //     enable_sync: true,
    //     meta: "ONFT"
    //   },
    // ]);
  }
  return true;
});

exports.down = knex => knex.schema.dropTable(ONFT_CONTRACT_TABLE)