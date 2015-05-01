define(['jquery', 'underscore', 'backbone', 'app',
	'modules/User',

	'bootstrap'
],
function ($, _, Backbone, app, User) {
	var Models = {},
		Collections = {},
		Views = {};

	Views.Wide = Backbone.View.extend({
		template: 'layouts/wide',
		beforeRender: function (options) {
			this.setViews({
				'header': new Views.Header()
			});
		}
	});

	Views['404'] = Views.Wide.extend({
		template: 'layouts/404'
	});

	Views.Unauthorized = Backbone.View.extend({
		template: 'layouts/wide',
		beforeRender: function(options) {
			this.setViews({
				'header': new Views.BlankHeader()
			});
		}
	});

	Views.NotFound = Backbone.View.extend({
		template: 'layouts/wide',
		beforeRender: function(options) {
			this.setViews({
				'header': new Views.BlankHeader()
			});
		}
	});

	Views.BlankHeader = Backbone.View.extend({
		template: 'header/header',
		serialize: function() {
			return {
				session: app.session.toJSON()
			};
		}
	});

	Views.Header = Backbone.View.extend({
		template: 'header/header',
		events: {
			'click .loginBtn': 'login'
		},
		initialize: function (options) {
			this.options = options || {};
			this.listenTo(app.session, 'sync', this.render);

			if (!app.session.has('email') && typeof $.cookie('access_token') !== 'undefined') {
				app.session.getAuthStatus({
					success: this.serverLogin
				});
			}
		},
		serialize: function() {
			return {
				androidProjs: app.projects.android.get('projects'),
				iosProjs: app.projects.ios.get('projects'),
				session: typeof $.cookie('access_token') !== 'undefined' ?
				app.session.toJSON() : null
			};
		},
		afterRender: function () {
			var $navLi = this.$el
				.find('a[href="' + window.location.pathname + '"]')
				.parent();
			$navLi.siblings().removeClass('active');
			$navLi.addClass('active');
		},
		login: function (e) {
			e.preventDefault();
			app.session.signIn({
				success: this.serverLogin
			});
		},
		serverLogin: function (authRes) {
			$.cookie('access_token', authRes.access_token);
			var login = new User.Models.Login();
			login.save(authRes).success(function (res) {
				app.session.set(res);
				app.session.set('authorized', true);
				app.session.set('admin', true);
				app.session.trigger('sync');
			});
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});
