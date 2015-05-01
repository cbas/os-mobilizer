define([
	'jquery',
	'underscore',
	'backbone',
	'app'
],
function (
	$, _, Backbone, app
) {
	var Models = {},
		Collections = {},
		Views = {};

	Collections.Branches = Backbone.Model.extend({
		model: Models.Branch,
		url: function() {
			return app.api(this.get('platform') + '/' + this.get('repo') + '/branches');
		},
		parse: function(res) {
			return { branches: res };
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});