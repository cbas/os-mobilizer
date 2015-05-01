define([
	'jquery', 'underscore', 'backbone', 'app',
	'modules/Session/Base',
	'modules/Layouts',
	'modules/User'
],
function ($, _, Backbone, app, Base, Layouts, User, FB) {

	var backboneSync = Backbone.sync;

	var pendingAjaxCounter = 0;

	Backbone.sync1 = function (method, model, options) {
		model.once('request', function (model, xhr, options) {
			xhr
				// Save session token on response
				.done(function (data) {
					console.log('done');
				})
				// App-wide global error handlers
				.fail(function (xhr, status, error) {
					var content;

					console.log(status);
					console.log(error);

					try {
						content = JSON.parse(xhr.responseText);
					} catch(e) { }

					if (content && content.status.code === 1302) {
						return;
					}

					if (+xhr.status === 401) {
						// Automatically sign out on expired token,
						// to trigger fetching a new token.
						app.session.signOut();
					}
					else if (+xhr.status === 410) {
						// API version changed, prompt user to refresh.
						app.useLayout(Layouts.Views['410']).render();
					}
					else if (+xhr.status !== 400 && +xhr.status !== 404) {
						// The API blew up!
						app.notification.add({
							text: content ? content.status.msg : ''
						}, '500');
					}
				})
				.always(function () {
					pendingAjaxCounter -= 1;
					if (pendingAjaxCounter === 0) {
						$(app.el).removeClass('loading');
					}
				});
		});

		pendingAjaxCounter += 1;
		if (pendingAjaxCounter === 1) {
			$(app.el).addClass('loading');
		}

		// Pass session token in request
		options = options || {};
		if (method === 'read') {
			// Adds token as query param in GET request
			options.data = _.defaults({
				session: app.session.get('session')
			}, options.data || {});

		} else {
			// JSON in other requests, not yet implemented in API
			options.attrs = _.defaults({
				session: app.session.get('session')
			}, model.toJSON(options), options.attrs || {});

			// Add query parameter to POST/PUT/DELETE requests
			var originalUrl = model.url;
			model.url = function () {
				var url = _.isFunction(originalUrl) ?
					originalUrl.call(model) :
					originalUrl;
				if (app.session.has('session')) {
					if (url.indexOf('?') === -1) {
						url += '?';
					} else {
						url += '&';
					}
					url += 'session=' + app.session.get('session');
				}
				return url;
			};
			var retval = backboneSync.call(this, method, model, options);
			model.url = originalUrl;
			return retval;
		}

		return backboneSync.call(this, method, model, options);
	};

	var session = Base.extend({
		signIn: function (options) {
			var that = this;
			options = options || {};
			options.success = options.success || $.noop;
			options.error = options.error || $.noop;

			var user = new User.Models.Login(
				FB.getAuthResponse()
			);

			user.save({}, {
				success: function (model, res) {
					console.log('successful login');
				},
				error: options.error
			});
		},
		signOut: function (options) {
			var that = this;
			var email = this.get('email');
			options = options || {};
			options.success = options.success || $.noop;

			if (this.has('session')) {
				_.chain(that.keys())
					.without('session')
					.each(function (key) {
						that.unset(key, {silent: true});
					});
				that.set({email: email});
				that.trigger('signOut');
				var user = new User.Models.Logout();
				user.save();
			}
			options.success();
		},
		getAuthStatus: function (options) {
			options = options || {};
			options.success = options.success || $.noop;
			options.error = options.error || $.noop;

			if (this.has('session')) {
				options.success();
			} else {
				options.error();
			}
		}
	});

	return session;
});
