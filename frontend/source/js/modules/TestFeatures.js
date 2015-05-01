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

	Collections.TestFeatures = Backbone.Model.extend({
		url: function() {
			return app.api('features?path=' + this.get('path') +
					(this.get('content') ? '&content=' + this.get('content') : '') +
					(this.get('sha') ? '&sha=' + this.get('sha') : '') +
					(this.get('message') ? '&message=' + this.get('message') : '') +
					(this.get('committer') ? '&committer[name]=' + this.get('committer').name + '&committer[email]=' +
					this.get('committer').email : ''));
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});