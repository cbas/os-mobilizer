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

	Models.Project = Backbone.Model.extend();

	Collections.Projects = Backbone.Model.extend({
		model: Models.Project,
		url: function() {
			return app.api('projects/' + this.get('platform') +
					(this.get('uri') ? '/' + this.get('uri') : ''));
		},
		parse: function(res) {
			return { projects: res };
		}
	});

	Models.Project = Backbone.Model.extend({
		url: function() {
			return app.api('projects?' + this.get('params'));
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});