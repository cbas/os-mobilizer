#!/bin/env node

var requirejs = require('requirejs');
requirejs.config({
	nodeRequire: require
});

requirejs([
	'app/app', 'express', 'fs', 'socket.io', 'config/db'
], function (app, express, fs, socketio, DB) {
	app.express = express();
	app.server = app.express.listen(
		app.conf.server.port,
		app.conf.server.ip,
		function () {
			console.log('%s: Node server started on %s:%d (%s config) ...',
				Date(Date.now()), app.conf.server.ip, app.conf.server.port,
				app.conf.confName
			);
		}
	);

	app.io = socketio.listen(app.server, { log: false });

	requirejs('config/express')(app.express, app.conf);
	requirejs('config/router')(app.express, app.conf);

	return app;
});
