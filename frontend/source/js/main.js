define([
	'jquery', 'underscore', 'libs/handlebars.helpers', 'backbone',
	'app',
	'modernizr',
	'router',
	'templates.built',
	'modules/Layouts',
	'modules/Projects',
	'components/Title',
	'modules/Session/Google',
	'notify',
	'growl',

	'jquery.cookie',
	'libs/jquery.mixins',
	'libs/underscore.mixins',
	'libs/jquery.fileupload'
], function (
	$, _, Handlebars, Backbone,
	app,
	modernizr,
	Router,
	templatesBuilt,
	Layouts,
	Projects,
	Title,
	Session,
	notify,
	growl
) {
	var JST = window.JST = _.extend(window.JST || {}, templatesBuilt);

	Backbone.Layout.configure({
		el: true,
		manage: true,
		prefix: '/templates/',
		fetch: function (path) {
			var prefix = Backbone.Layout.prototype.getAllOptions().prefix,
				bare = path.substr(prefix.length);

			if (JST[bare]) { return JST[bare]; }

			var done = this.async();
			$.get(path + '.html', function (response) {
				JST[bare] = Handlebars.compile(response);
				done(JST[bare]);
			}, 'text');
		}
	});

	window.gapi.client.setApiKey(app.conf.googleapp.key);

	app.title = new Title();

	app.projects = {};
	app.projects.android = new Projects.Collections.Projects({
		platform: 'android'
	});
	app.projects.ios = new Projects.Collections.Projects({
		platform: 'ios'
	});
	_.invoke([app.projects.android, app.projects.ios], 'fetch');

	app.session = new Session();
	app.router = new Router();

	Backbone.history.start({
		pushState: true,
		root: app.root
	});

	$(document).on('click', 'a:not([data-bypass]):not(.disabled)',
		function (event) {
			var href = $(this).prop('href'),
				baseURI = location.href.substr(0, location.href.indexOf('/', 8)),
				root = baseURI + app.root,
				isInternalLink = function (href, root) {
					return href && href.slice(0, root.length) === root;
				},
				holdingModifierKey = function (event) {
					return event.altKey ||
						event.ctrlKey ||
						event.metaKey ||
						event.shiftKey;
				};

			if (href.indexOf('#') !== -1) {
				event.preventDefault();
			} else if (isInternalLink(href, root) && !holdingModifierKey(event)) {
				event.preventDefault();
				Backbone.history.navigate(href.slice(root.length), true);
			}
		})
	.on('click', 'a.disabled', function (e) {
		e.preventDefault();
	})
	.on('touchstart', function () {
		app.touch = true;
	})
	.on('touchend', function () {
		setTimeout(function () {
			app.touch = false;
		}, 1000);
	});

	$('#testtabs a').click(function (e) {
		e.preventDefault();
		$(this).tab('show');
	});

	$.notification.requestPermission();
});
