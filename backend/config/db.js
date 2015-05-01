define([
	'app/app', 'mongodb', 'events'
], function (
	app, mongodb, events
) {
	var OBJ = new events.EventEmitter();

	mongodb.MongoClient.connect(app.conf.mongo.url, function (err, db) {
		if (err) {
			throw err;
		}
		db.collection('runs').ensureIndex({unique: true}, function (err) {
			if (err) throw err;
		});

		OBJ.db = db;
		app.db = db;

		OBJ.emit('db.ready');
		app.emit('db.ready');
	});

	return OBJ;
});