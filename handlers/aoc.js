var turf = require('turf');
var format = require('pg-format');

function FeatureCollection() {
  this.type = 'FeatureCollection';
  this.features = new Array();
}

function in_aoc(geojson) {
  console.log(geojson);
  var query = format("SELECT  st_asgeojson(st_transform(p.geom, 4326)) as geom, ST_AREA(ST_INTERSECTION(d.geom, st_transform(p.geom, 4326))) as area, appellatio, id_uni \
                  FROM Appellation as p,\
                    (SELECT ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326) geom) d\
                  WHERE ST_Intersects(st_transform(p.geom, 4326), d.geom) LIMIT 50;", geojson.geometry);
  console.log(query)
  return query;
}

function bbox_aoc(bbox) {
  var query = format("select st_asgeojson(st_transform(Appellation.geom, 4326)) as geom, id_uni, appellatio, commune \
from Appellation, (select st_makeenvelope(%s, %s, %s, %s, 4326) geom) d \
where st_intersects(d.geom , st_transform(Appellation.geom, 4326)) LIMIT 50;", bbox[0], bbox[1], bbox[2], bbox[3])
  console.log(query);
  return query
}

exports.in = function(request, reply) {

  var payload = request.payload.geom;
  var geojson = JSON.parse(payload);
  var sql = in_aoc(geojson);
  request.pg.client.query(sql, function(err, result) {

    if (err) {
      throw err;
    }
    var featureCollection = new FeatureCollection();
    if (result.rows == undefined) {
      return reply({
        status: 'No Data'
      }).code(404).header('access-control-allow-origin', '*')
    }
    for (var i = 0; i < result.rows.length; i++) {
      featureCollection.features[i] = {
        type: "Feature",
        geometry: JSON.parse(result.rows[i].geom),
        properties: {
          area_inter: result.rows[i].area,
          appellation: result.rows[i].appellatio,
          id_uni: result.rows[i].id_uni,
        }
      }
    }
    reply(featureCollection)
      .header('access-control-allow-origin', '*')
  })
}
exports.bbox = function(request, reply) {
  var bbox = request.query.bbox.split(',');
  sql = bbox_aoc(bbox);

  request.pg.client.query(sql, function(err, result) {
    if (err) {
      throw err;
    }
    var featureCollection = new FeatureCollection();
    if (result.rows == undefined) {
      return reply({
        status: 'No Data'
      }).code(404).header('access-control-allow-origin', '*')
    }
    for (var i = 0; i < result.rows.length; i++) {
      featureCollection.features[i] = {
        type: "Feature",
        geometry: JSON.parse(result.rows[i].geom),
        properties: {
          commune: result.rows[i].commune,
          appellation: result.rows[i].appellatio,
          id_uni: result.rows[i].id_uni,
        }
      }
    }
    reply(featureCollection)
      .header('access-control-allow-origin', '*')
  })
}
