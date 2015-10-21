var Hapi = require('hapi');
var config = require('config');
var server = new Hapi.Server();
server.connection({ host: 'localhost', port:'8091' });

var options = {
    opsInterval: 1000,
    reporters: [{
        reporter: require('good-console'),
        events: { log: '*', response: '*' }
    }
    ]
};

var plugin = {
    register: require('hapi-node-postgres'),
    options: {
        connectionString: 'postgres://'+config.dbConfig.user+ ':' + config.dbConfig.password +'@localhost/apicarto-aoc'
    }
};

server.register(plugin, function (err) {

    if (err) {
        console.error('Failed loading "hapi-node-postgres" plugin');
    }
});

server.register({
    register: require('good'),
    options: options
}, function (err) {

    if (err) {
        console.error(err);
    }
});

server.route(require('./routes'));

server.start();
