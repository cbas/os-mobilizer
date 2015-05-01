define([
	'underscore', 'config/config.js', 'googleapis'
], function (_, conf, googleapis) {

	var Actions = {}, Private = {};
	var OAuth2 = googleapis.auth.OAuth2Client;

	Actions.login = function (req, res) {
		var oauth2Client = new OAuth2(
			conf.googleapp.id,
			conf.googleapp.secret,
			'/'
		);
		oauth2Client.credentials = {
			access_token: req.body.access_token
		};

		googleapis
		.discover('plus', 'v1')
		.execute(function(err, client) {
			client.plus.people.get({ userId: 'me' })
			.withAuthClient(oauth2Client)
			.execute(function (err, account, resp) {
				if (err) {
					res.json(500, {msg: err.message});
				} else {
					var email = account.emails[0]['value'];
					account.access_token = req.body.access_token;

					res.cookie(
						'access_token',
						req.body.access_token,
						{
							httpOnly: false,
							domain: conf.session.cookie.domain
						}
					);

					res.send(200, _.extend(
						{"msg": "success"},
						{
							"displayName": resp.body.displayName,
							"image": resp.body.image.url,
						 	"email": email
						}
					));
				}
			});
		});
	}

	Actions.logout = function (req, res) {
		req.session = null;
		res.redirect('/');
	}

	return Actions;
});
