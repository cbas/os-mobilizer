define(['jquery', 'underscore', 'backbone', 'app'],
function ($, _, Backbone, app) {
	var Models = {},
		Collections = {},
		Views = {};


	Models.Login = Backbone.Model.extend({
		url: function () {
			return app.api('login');
		}
	});

	Models.Logout = Backbone.Model.extend({
		url: function () {
			return app.api('logout');
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};
});
