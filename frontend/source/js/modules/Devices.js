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

	Collections.Devices = Backbone.Model.extend({
		model: Models.Device,
		url: function() {
			return app.api('devices/' + this.get('platform'));
		},
		parse: function(res) {
			return { devices: res };
		}
	});

	Models.Device = Backbone.Model.extend({
		url: function() {
			return app.api('devices?' + this.get('params'));
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});