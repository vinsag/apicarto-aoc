var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var pg = require('pg');
var morgan = require('morgan');
var aoc = require('./controllers/aoc');

var app = express();
var port = process.env.PORT || 8091;

app.use(bodyParser.json());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));

/* Middlewares */
function pgClient(req, res, next) {
    pg.connect(process.env.PG_URI, function (err, client, done) {
        if (err) return next(err);
        req.pgClient = client;
        req.pgEnd = done;
        next();
    });
}

function pgEnd(req, res, next) {
    if (req.pgEnd) req.pgEnd();
    next();
}

/* Routes */
app.post('/aoc/api/beta/aoc/in', pgClient, aoc.in, pgEnd);
app.get('/aoc/api/beta/aoc/bbox', pgClient, aoc.bbox, pgEnd);

/* Ready! */
app.listen(port, function () {
    console.log('Start listening on port %d', port);
});
