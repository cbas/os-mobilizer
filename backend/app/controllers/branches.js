define([
	'underscore',
	'config/config.js',
	'restler'
], function (_, conf, restler) {

	var Actions = {};

	Actions.branches = function(req, res) {
		restler.get('https://api.github.com/repos/' + conf.github.name + '/' +
						req.params.repo + '/branches?access_token=' + conf.github.token)
		.on('complete', function(result, response) {
			if (response.statusCode === 200) {
				res.send(200, result);
			} else {
				res.send(200, []);
			}
		});
	}

	return Actions;
});