define([
	'underscore',
	'config/config.js',
	'app/app',
	'mongodb'
], function (_, conf, app, mongodb) {

	var Actions = {}, db = {};

	app.on('db.ready', function () {
		db = app.db;
	});

	Actions.create = function(req, res) {
		if (db) {
			var deviceCollection = db.collection('devices');

			var device = {};
			device.tablet = false;
			for (var key in req.query) {
				if (key !== '_id') {
					if (key === 'tablet') {
						device[key] = true;
					} else {
						device[key] = req.query[key];
					}
				}
			}

			deviceCollection.insert(device, {safe: true}, function (err, insertedModels) {
				if (err) {
					res.send(500, {msg: err.message});
				} else {
					res.send(200, {device: device});
				}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	Actions.update = function(req, res) {
		if (db) {
			var deviceCollection = db.collection('devices');

			deviceCollection.findOne({ _id: new mongodb.ObjectID(req.query._id) },
				function (err, device) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						device.tablet = false;
						for (var key in req.query) {
							if (key !== '_id') {
								if (key === 'tablet') {
									device[key] = true;
								} else {
									device[key] = req.query[key];
								}
							}
						}

						deviceCollection.update(
							{ _id: new mongodb.ObjectID(req.query._id) },
							device,
							function (err, updatedModels) {
								if (err) {
									res.send(500, {msg: err.message});
								} else {
									res.send(200, {device: device});
								}
							});
					}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	Actions.delete = function(req, res) {
		if (db) {
			var deviceCollection = db.collection('devices');

			deviceCollection.remove({ _id: new mongodb.ObjectID(req.query._id) },
				function (err, device) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						res.send(200, {msg: 'Device deleted.'});
					}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}	
	}

	Actions.list = function(req, res) {
		if (db) {
			var deviceCollection = db.collection('devices');
			if (req.params.uri) {
				deviceCollection.findOne({ platform: req.params.platform, uri: req.params.uri }, function (err, devices) {
					if (err) {
	    				res.send(500, {msg: err.message});
					} else {
						res.json(devices);
					}
				});
			} else {
				if (req.params.platform) {
					deviceCollection.find({ platform: req.params.platform }).sort({ id: 0 }).toArray(function (err, devices) {
						if (err) {
		    				res.send(500, {msg: err.message});
						} else {
							res.json(devices);
						}
					});
				} else {
					deviceCollection.find().sort({ id: 0 }).toArray(function (err, devices) {
						if (err) {
		    				res.send(500, {msg: err.message});
						} else {
							res.json(devices);
						}
					});
				}
			}
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	return Actions;
});