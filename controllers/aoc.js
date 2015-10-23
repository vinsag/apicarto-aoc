var format = require('pg-format');
var _ = require('lodash');

function in_aoc_geom(geometry) {
    var query = format('SELECT  \
                        st_asgeojson(ST_TRANSFORM(p.geom, 4326)) as geom, \
                        ST_AREA(ST_INTERSECTION(d.geom, p.geom)) as area, appellation, id_uni, \
                        ST_CONTAINS(d.geom, p.geom) as contains\
                  FROM Appellation as p,\
                    (SELECT ST_TRANSFORM(ST_SetSRID(ST_GeomFromGeoJSON(\'%s\'), 4326), 2154) geom) d\
                  WHERE ST_INTERSECTS(p.geom, d.geom);', geometry);
    return query;
}

function in_aoc_geom_com(geometry) {
    var query = format('select st_asgeojson(ST_TRANSFORM(appellation.geom, 4326)) as geom, \
                        ST_AREA(ST_INTERSECTION(com.geom, appellation.geom)) as area, appellation, id_uni, \
                        ST_CONTAINS(com.geom, appellation.geom) as contains from \
(SELECT                   c.nom , insee  , st_transform(d.geom, 2154) as geom \
FROM Communes as c, \
 (SELECT ST_SetSRID(ST_GeomFromGeoJSON(\'%s\'), 4326) geom) d \
WHERE ST_Intersects(c.geom, d.geom)) as com, appellation \
where com.insee=appellation.insee;', geometry);
    return query;
}

function in_aoc_nogeom(geometry) {
    var query = format('SELECT \
                        ST_AREA(ST_INTERSECTION(d.geom, p.geom)) as area, appellation, id_uni, \
                        ST_CONTAINS(p.geom, d.geom) as contains\
                  FROM Appellation as p,\
                    (SELECT ST_TRANSFORM(ST_SetSRID(ST_GeomFromGeoJSON(\'%s\'), 4326), 2154) geom) d\
                  WHERE ST_Intersects(p.geom, d.geom);', geometry);
    return query;
}

function bbox_aoc(bbox) {
    var query = format('select st_asgeojson(st_transform(Appellation.geom, 4326)) as geom, id_uni, appellation, commune \
                        from Appellation, (select st_makeenvelope(%s, %s, %s, %s, 4326) geom) d \
                        where st_intersects(d.geom , st_transform(Appellation.geom, 4326)) LIMIT 50;', bbox[0], bbox[1], bbox[2], bbox[3]);
    return query;
}

exports.in = function(req, res, next) {
    if (req.body.geom) {
        var geom = req.body.geom.geometry;
    } else {
        res.sendStatus(400);
        return next();
    }

    var sql;
    if (req.body.geojson === false) {
        sql = in_aoc_nogeom(geom);
    } else if (req.body.communes === false){
        sql = in_aoc_geom(geom);
    } else {
        sql = in_aoc_geom_com(geom);
    }

    req.pgClient.query(sql, function(err, result) {
        req.pgEnd();
        if (err) return next(err);

        if (!result.rows) {
            return res.status(404).send({ status: 'No Data' });
        }

        if (req.body.geojson === false) {
            return res.send(result.rows);
        }

        return res.send({
            type: 'FeatureCollection',
            features: result.rows.map(function (row) {
                return {
                    type: 'Feature',
                    geometry: JSON.parse(row.geom),
                    properties: _.pick(row, 'area', 'appellation', 'id_uni', 'contains')
                };
            })
        });
    });
};

exports.bbox = function (req, res, next) {
    var bbox = req.query.bbox.split(',');
    var sql = bbox_aoc(bbox);

    req.pgClient.query(sql, function(err, result) {
        req.pgEnd();
        if (err) return next(err);
        
        if (!result.rows) {
            return res.status(404).send({ status: 'No Data' });
        }

        return res.send({
            type: 'FeatureCollection',
            features: result.rows.map(function (row) {
                return {
                    type: 'Feature',
                    geometry: JSON.parse(row.geom),
                    properties: _.pick(row, 'communes', 'appellation', 'id_uni')
                };
            })
        });
    });
};
