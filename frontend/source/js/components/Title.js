define(['jquery' ,'underscore', 'backbone'],
function ($, _, Backbone) {
	return Backbone.Model.extend({
		defaults: {
			title: 'Mobilizer'
		},
		initialize: function (properties, options) {
			this.options = options || {};
			this.$document = $(document);
			this.on('change:title', this.domTitle, this);

			this.defaultTitle();
		},
		defaultTitle: function () {
			this.setTitle(this.defaults.title);
		},
		setTitle: function (title) {
			if (!title) {
				return this.defaultTitle();
			}
			this.set({title: title});
		},
		setTitleFromObj: function (object, attribute) {
			var that = this;
			that.setTitle(object.get(attribute));
			object.on('change:' + attribute, function() {
				that.setTitle(object.get(attribute));
			});
		},
		domTitle: function () {
			this.$document.attr('title', this.get('title'));
		}
	});
});
