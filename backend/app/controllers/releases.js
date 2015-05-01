define([
	'underscore',
	'config/config.js',
	'restler',
	'app/helpers/parseRelease',
	'app/app'
], function (_, conf, restler, parseRelease, app) {

	var Actions = {}, db = {};

	app.on('db.ready', function () {
		db = app.db;
	});

	Actions.releases = function(req, res) {
		if (db) {
			var projCollection = db.collection('projects');
			projCollection.findOne({ repo: req.params.repo, platform: req.params.platform }, function (err, project) {
				if (err) {
					res.send(500, {msg: err.message});
				} else {
					if (project) {
						restler.get('https://api.github.com/repos/' + conf.github.name + '/' +
						req.params.repo + '/releases?access_token=' + conf.github.token)
						.on('complete', function(result, response) {
							if (response.statusCode === 200) {
								var releases = parseRelease(result, project, req.params.platform);

								res.send(200, { releases: releases,
									repo: req.params.repo, platform: req.params.platform });
							} else {
								res.send(200, { releases: [],
									repo: req.params.repo, platform: req.params.platform });
							}
						});
					} else {
						res.send(400, {msg: 'Project with that repo does not exist.'});						
					}
				}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	return Actions;
});