define([
	'underscore', 'config/config', 'events'
], function (_, conf, events) {

	var app = new events.EventEmitter();
	app.conf = conf;
	app.express = {};
	app.server = {};
	app.io = {};
	app.gb = {};

	return app;
});
