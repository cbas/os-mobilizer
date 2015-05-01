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
			var projCollection = db.collection('projects');
			var project = {};
			project.testing = false;

			for (var key in req.query) {
				if (key !== '_id') {
					if (key === 'testing') {
						project[key] = true;
					} else {
						project[key] = req.query[key].replace(/(\r\n|\n)/g, "");
					}
				}
			}

			projCollection.findOne({ platform: project.platform, uri: project.uri }, function(err, proj) {
				if (err) {
					res.send(500, {msg: err.message});
				} else {
					if (proj) {
						res.send(400, {msg: 'Project with uri already exists.'});	
					} else {
						projCollection.insert(project, {safe: true}, function (err, insertedModels) {
							if (err) {
								res.send(500, {msg: err.message});
							} else {
								res.send(200, {project: project});
							}
						});
					}			
				}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	Actions.update = function(req, res) {
		if (db) {
			var projCollection = db.collection('projects');
			projCollection.findOne({ _id: new mongodb.ObjectID(req.query._id) },
				function (err, project) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						project.testing = false;
						for (var key in req.query) {
							if (key !== '_id') {
								if (key === 'testing') {
									project[key] = true;
								} else {
									project[key] = req.query[key].replace(/(\r\n|\n)/g, "");
								}
							}
						}

						projCollection.findOne({ platform: project.platform, uri: project.uri }, function(err, proj) {
							if (err) {
								res.send(500, {msg: err.message});								
							} else {
								if (proj && !proj._id.equals(project._id)) {
									res.send(400, {msg: 'Project with uri already exists.'});	
								} else {
									projCollection.update(
										{ _id: new mongodb.ObjectID(req.query._id) },
										project,
										{ upsert: true },
										function (err, updatedModels) {
											if (err) {
												res.send(500, {msg: err.message});
											} else {
												res.send(200, {project: project});
											}
										});
								}
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
			var projCollection = db.collection('projects');
			projCollection.remove({ _id: new mongodb.ObjectID(req.query._id) },
				function (err, project) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						res.send(200, {msg: 'Project deleted.'});
					}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}	
	}

	Actions.list = function(req, res) {
		if (db) {
			var projCollection = db.collection('projects');
			if (req.params.uri) {
				projCollection.findOne({ platform: req.params.platform, uri: req.params.uri }, function (err, projects) {
					if (err) {
	    				res.send(500, {msg: err.message});
					} else {
						res.json(projects);
					}
				});
			} else {
				if (req.params.platform) {
					projCollection.find({ platform: req.params.platform }).sort({ id: 0 }).toArray(function (err, projects) {
						if (err) {
		    				res.send(500, {msg: err.message});
						} else {
							res.json(projects);
						}
					});
				} else {
					projCollection.find().sort({ id: 0 }).toArray(function (err, projects) {
						if (err) {
		    				res.send(500, {msg: err.message});
						} else {
							res.json(projects);
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