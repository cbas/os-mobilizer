define([
	'underscore',
	'config/config.js',
	'restler'
], function (_, conf, restler) {

	var Actions = {};

	Actions.getRoles = function (req, res) {
		if (!req.body.access_token) {
			res.send(400, {msg:'Access_token is not provided.'});
			return;
		}

		/** Add additional logic here to get user roles based on email/access token **/
		res.json(200, {});
	};

	return Actions;

});