define(['jquery', 'underscore', 'backbone', 'app'],
function ($, _, Backbone, app) {
	var Models = {},
		Collections = {},
		Views = {};


	Models.Settings = Backbone.Model.extend({
		url: function () {
			return app.api(this.get('params') ? 'settings?' + this.get('params') : 'settings');
		},
		parse: function(res) {
			return { settings: res };
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};
});