const { NFT_TABLE } = require("../tables");

exports.up = async (knex) => {
  await knex.raw(`
    UPDATE ${NFT_TABLE}
    SET longitude_postgis = ST_SetSRID(ST_MakePoint(longitude, 0), 4326),
        latitude_postgis = ST_SetSRID(ST_MakePoint(0, latitude), 4326)
    WHERE longitude IS NOT NULL
      AND latitude IS NOT NULL
      AND (longitude_postgis IS NULL OR latitude_postgis IS NULL);
  `);
};

exports.down = (knex) => {
  return true;
};