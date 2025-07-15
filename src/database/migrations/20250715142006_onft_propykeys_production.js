const { ONFT_CONTRACT_TABLE, NETWORK_TABLE } = require("../tables");

const dotenv = require("dotenv");

dotenv.config();

const APP_ENV = process.env.APP_ENV || "prod";

exports.up = async (knex) => {
  return knex(ONFT_CONTRACT_TABLE).insert([
      { 
        onft_address: "0x5D36b0dc9040373c9C145077303Fc145e33f4db1",
        nft_address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E",
        network_name: "base",
        source_nft_address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E",
        source_nft_network_name: "base",
        events: ["ONFTSent", "ONFTReceived"],
        deployment_block: "32897865",
        enable_sync: true,
        meta: "ONFTAdapter"
      },
      { 
        onft_address: "0x2671F689317F636baCB92594342e19Cdd163833e",
        nft_address: "0x2671F689317F636baCB92594342e19Cdd163833e",
        network_name: "bnb-mainnet",
        source_nft_address: "0xa239b9b3E00637F29f6c7C416ac95127290b950E",
        source_nft_network_name: "base",
        events: ["ONFTSent", "ONFTReceived"],
        deployment_block: "54122559",
        enable_sync: true,
        meta: "ONFT"
      },
    ]);
}

exports.down = knex => knex(ONFT_CONTRACT_TABLE).where("onft_address", "0x2671F689317F636baCB92594342e19Cdd163833e").orWhere("onft_address", "0x5D36b0dc9040373c9C145077303Fc145e33f4db1").delete();