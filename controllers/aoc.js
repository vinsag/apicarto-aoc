var format = require('pg-format');
var _ = require('lodash');

function in_aoc_geom(geometry) {
    return format(`
        SELECT
            ST_AsGeoJSON(p.geom) AS geom,
            ST_AREA(ST_INTERSECTION(d.geom, p.geom)) AS area,
            appellation,
            id_uni,
            ST_CONTAINS(d.geom, p.geom) AS contains
        FROM
            Appellation AS p,
            (SELECT ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326) geom) d
        WHERE ST_INTERSECTS(p.geom, d.geom);`
    , geometry);
}

function in_aoc_geom_com(geometry) {
    return format(`
        SELECT
            ST_AsGeoJSON(appellation.geom) AS geom,
            ST_AREA(ST_INTERSECTION(com.geom, appellation.geom)) AS area,
            appellation,
            id_uni,
            ST_CONTAINS(com.geom, appellation.geom) AS contains
        FROM
            (
                SELECT
                    c.nom,
                    insee,
                    d.geom AS geom

                FROM
                    Communes AS c,
                    (SELECT ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326) geom) d
                WHERE ST_Intersects(c.geom, d.geom)
            ) AS com,
            appellation
        WHERE com.insee=appellation.insee;`
    , geometry);
}

function in_aoc_nogeom(geometry) {
    return format(`
        SELECT
            ST_AREA(ST_INTERSECTION(d.geom, p.geom)) AS area,
            appellation,
            id_uni,
            ST_CONTAINS(p.geom, d.geom) AS contains
        FROM
            Appellation AS p,
            (SELECT ST_SetSRID(ST_GeomFromGeoJSON('%s'), 4326) geom) d
        WHERE ST_Intersects(p.geom, d.geom);`, geometry);
}

function bbox_aoc(bbox) {
    return format(`
        SELECT
            ST_AsGeoJSON(Appellation.geom) AS geom,
            id_uni,
            appellation,
            commune
        FROM
            Appellation,
            (SELECT st_makeenvelope(%s, %s, %s, %s, 4326) geom) d
        WHERE ST_Intersects(d.geom , Appellation.geom)
        LIMIT 50;`
    , bbox[0], bbox[1], bbox[2], bbox[3]);
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
