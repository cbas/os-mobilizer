define(['jquery', 'underscore', 'backbone', 'app'],
function ($, _, Backbone, app) {
	var Models = {},
		Collections = {},
		Views = {};

	Views.Landing = Backbone.View.extend({
		template: 'landing/landing',
		events: {
		},
		initialize: function () {

		},
		serialize: function () {

		},
		afterRender: function () {

		}
	});

	Views.Unauthorized = Backbone.View.extend({
		template: 'landing/unauthorized'
	});

	Views.NotFound = Backbone.View.extend({
		template: 'landing/notfound'
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});