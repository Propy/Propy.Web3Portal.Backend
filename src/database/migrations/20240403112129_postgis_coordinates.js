const { NFT_TABLE } = require("../tables");

exports.up = async (knex) => {
  await knex.schema.alterTable(NFT_TABLE, table => {
    table.specificType('longitude_postgis', 'geometry(Point, 4326)').nullable();
    table.specificType('latitude_postgis', 'geometry(Point, 4326)').nullable();
  });

  await knex.raw(`
    UPDATE ${NFT_TABLE}
    SET longitude_postgis = ST_SetSRID(ST_MakePoint(longitude, 0), 4326),
        latitude_postgis = ST_SetSRID(ST_MakePoint(0, latitude), 4326)
    WHERE longitude IS NOT NULL AND latitude IS NOT NULL;
  `);
};

exports.down = (knex) => {
  return knex.schema.alterTable(NFT_TABLE, table => {
    table.dropColumn("longitude_postgis");
    table.dropColumn("latitude_postgis");
  });
};