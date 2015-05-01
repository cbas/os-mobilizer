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

	Models.Codesign = Backbone.Model.extend({
		url: function() {
			return app.api('codesign/' + this.get('type') + '/' + this.get('build'));
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});