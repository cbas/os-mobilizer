define([
	'underscore',
	'config/config.js',
	'mongodb',
	'app/app'
], function (_, conf, mongodb, app) {

	var Actions = {}, db = {};

	app.on('db.ready', function () {
		db = app.db;
	});

	Actions.get = function (req, res) {
		if (db) {
			var settingsCollection = db.collection('settings');
			settingsCollection.find().sort({ id: 0 }).toArray(function (err, settings) {
				if (err) {
    				res.send(500, {msg: err.message});
				} else {
					settings[0].github_name = conf.github.name;
					res.json(settings[0]);
				}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	};

	Actions.update = function (req, res) {
		if (db) {
			var settingsCollection = db.collection('settings');

			if (req.query._id.length > 0) {
				settingsCollection.findOne({ _id: new mongodb.ObjectID(req.query._id) },
					function (err, settings) {
						if (err) {
							res.send(500, {msg: err.message});
						} else {
							for (var key in req.query) {
								if (key !== '_id') {
									settings[key] = req.query[key];
								}
							}

							settingsCollection.update(
								{ _id: new mongodb.ObjectID(req.query._id) },
								settings,
								function (err, updatedModels) {
									if (err) {
										res.send(500, {msg: err.message});
									} else {
										settings.github_name = conf.github.name;
										res.send(200, {settings: settings});
									}
								});
						}
				});
			} else {
				var settings = {};

				for (var key in req.query) {
					if (key !== '_id') {
						settings[key] = req.query[key];
					}
				}

				settingsCollection.insert(settings, {safe: true}, function (err, insertedModels) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						settings.github_name = conf.github.name;
						res.send(200, {settings: settings});
					}
				});
			}
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	};

	return Actions;

});