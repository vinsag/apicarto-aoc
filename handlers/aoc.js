var turf = require('turf');
var format = require('pg-format');

function FeatureCollection() {
  this.type = 'FeatureCollection';
  this.features = new Array();
}

function in_aoc_geom(geometry) {
  var query = format("SELECT  \
                        st_asgeojson(ST_TRANSFORM(p.geom, 4326)) as geom, \
                        ST_AREA(ST_INTERSECTION(d.geom, p.geom)) as area, appellatio, id_uni, \
                        ST_CONTAINS(d.geom, p.geom) as contains\
                  FROM Appellation as p,\
                    (SELECT ST_TRANSFORM(ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326), 2154) geom) d\
                  WHERE ST_INTERSECTS(p.geom, d.geom);", geometry);
  return query;
}

function in_aoc_geom_com(geometry){
  var query = format("select st_asgeojson(ST_TRANSFORM(appellation.geom, 4326)) as geom, \
                        ST_AREA(ST_INTERSECTION(com.geom, appellation.geom)) as area, appellatio, id_uni, \
                        ST_CONTAINS(com.geom, appellation.geom) as contains from \
(SELECT                   c.nom , insee  , st_transform(d.geom, 2154) as geom \
FROM Communes as c, \
 (SELECT ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326) geom) d \
WHERE ST_Intersects(c.geom, d.geom)) as com, appellation \
where com.insee=appellation.insee;", geometry)
return query;
}

function in_aoc_nogeom(geometry) {
  var query = format("SELECT \
                        ST_AREA(ST_INTERSECTION(d.geom, p.geom)) as area, appellatio, id_uni, \
                        ST_CONTAINS(p.geom, d.geom) as contains\
                  FROM Appellation as p,\
                    (SELECT ST_TRANSFORM(ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326), 2154) geom) d\
                  WHERE ST_Intersects(p.geom, d.geom);", geometry);
  return query;
}


function bbox_aoc(bbox) {
  var query = format("select st_asgeojson(st_transform(Appellation.geom, 4326)) as geom, id_uni, appellatio, commune \
from Appellation, (select st_makeenvelope(%s, %s, %s, %s, 4326) geom) d \
where st_intersects(d.geom , st_transform(Appellation.geom, 4326)) LIMIT 50;", bbox[0], bbox[1], bbox[2], bbox[3])
  return query
}

exports.in = function(request, reply) {
  var geojson_payload = request.payload.geom;
  var geojson = JSON.parse(geojson_payload);
  console.log(request.payload);
  if (request.payload.geojson == 'false') {
    var sql = in_aoc_nogeom(geojson.geometry);
  } else {
    if (request.payload.communes == 'false'){
      var sql = in_aoc_geom(geojson.geometry);
    }
    else{
      var sql = in_aoc_geom_com(geojson.geometry)
    }
  }
  request.pg.client.query(sql, function(err, result) {

    if (err) {
      throw err;
    }

    if (result.rows == undefined) {
      return reply({
        status: 'No Data'
      }).code(404).header('access-control-allow-origin', '*')
    }
    if (request.payload.geojson == 'false') {
      reply(result.rows)
        .header('access-control-allow-origin', '*')
    } else {
      var featureCollection = new FeatureCollection();

      for (var i = 0; i < result.rows.length; i++) {
        featureCollection.features[i] = {
          type: "Feature",
          geometry: JSON.parse(result.rows[i].geom),
          properties: {
            area_inter: result.rows[i].area,
            appellation: result.rows[i].appellatio,
            id_uni: result.rows[i].id_uni,
            contains : result.rows[i].contains
          }
        }
      }
      reply(featureCollection)
        .header('access-control-allow-origin', '*')
    }
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
