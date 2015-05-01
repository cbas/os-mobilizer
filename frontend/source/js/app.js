define([
	'jquery', 'underscore', 'backbone',
	'backbone.layoutmanager',
	'libs/url',
	'socket.io',
	'constants',

	'config/env.prod',
	'config/env.local'
], function (
	$, _, Backbone,
	LayoutManager,
	url,
	io,
	constants
) {

	var conf = (function () {
		var domains = {
			local: ['localhost:9000', '127.0.0.1:9000']
		};

		if (_.contains(domains.local, window.location.host)) {
			return require('config/env.local');
		} else {
			return require('config/env.prod');
		}
	}());

	var app = _.extend({
		conf: conf,
		constants: constants,
		el: '#app',
		root: '/',
		$: {
			window: $(window),
			document: $(document),
			body: $('body'),
			app: $('#app')
		},

		api: function (path) {
			var apiBasePath = '//' + window.location.host + '/api/';
			var fields = Array.prototype.slice.call(arguments, 1);

			if (this.conf.version === 'development') {
				apiBasePath = '//localhost:9081/';
			} else if (!$.support.cors) {
				apiBasePath = '/api/';
			}

			fields.unshift({});
			var merged = _.extend.apply(null, fields);
			return apiBasePath + url(path, merged);
		},

		useLayout: function (layout, options) {
			options = options || {};

			if (_.isString(layout)) {
				if (this.layout) {
					this.layout.template = layout;
				} else {
					this.layout = new Backbone.Layout(_.extend({
						el: app.el,
						template: layout
					}, options));
				}
			}

			else if (
				(layout.prototype instanceof Backbone.Layout ||
					layout.prototype instanceof Backbone.View)
			) {
				var Constructor = layout;
				if (this.layout) {
					this.layout.remove();
				}
				this.layout = new Constructor(_.extend({
					el: false
				}, options));
				$(app.el).empty().append(this.layout.el);
			}

			return this.layout;
		}

	}, Backbone.Events);

	app.socket = io.connect(conf.version === 'development' ? '127.0.0.1:9081' : '');

	return app;
});
