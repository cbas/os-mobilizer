define([
	'underscore',
	'config/config.js',
	'restler'
], function (_, conf, restler) {
	var Actions = {};

	Actions.listFeatures = function(req, res) {
		restler.get('https://api.github.com/repos/' + conf.github.name + '/calabash/contents/' +
					req.query.path + '?access_token=' + conf.github.token +
					(req.query.content ? '&content=' + req.query.content : '') +
					(req.query.sha ? '&sha=' + req.query.sha : '') +
					(req.query.message ? '&message=' + req.query.message : '') +
					(req.query.committer ? '&committer[name]=' + req.query.committer.name + '&committer[email]=' +
					req.query.committer.email : ''))
		.on('complete', function(result, response) {
			if (response.statusCode === 200 && result.length > 0) {
				result.forEach(function(feature, index) {
					feature.local_path = 'features/' + feature.name;
					feature.display_name = feature.name.replace('.feature', '');
				});

				res.send(200, { testFeatures: result });	
			} else {
				res.send(200, { testFeatures: [] });
			}
		});
	}

	Actions.updateFeatures = function(req, res) {
		var jsonData = {
			content: req.query.content ? req.query.content : '',
			sha: req.query.sha ? req.query.sha : '',
			message: req.query.message ? req.query.message : '',
			committer: req.query.committer ? { name: req.query.committer.name, email: req.query.committer.email } : ''
		};
		restler.putJson('https://api.github.com/repos/' + conf.github.name + '/calabash/contents/' +
					req.query.path + '?access_token=' + conf.github.token, jsonData)
		.on('complete', function(result) {
			result.forEach(function(feature, index) {
				feature.local_path = 'features/' + feature.name;
				feature.display_name = feature.name.replace('.feature', '');
			});

			res.send(200, { testFeatures: result });
		});
	}

	Actions.deleteFeatures = function(req, res) {
		restler.del('https://api.github.com/repos/' + conf.github.name + '/calabash/contents/' +
					req.query.path + '?sha=' + req.query.sha + '&message=' + req.query.message +
					'&committer[name]=' + req.query.committer.name +
					'&committer[email]=' + req.query.committer.email + '&access_token=' + conf.github.token)
		.on('complete', function(result) {
			res.send(200, { testFeatures: result });
		});
	}

	return Actions;
});