define(['app', 'underscore', 'modules/Session/Base'],
function (app, _, Session) {
	return Session.extend({
		initialize: function (properties, options) {
			this.options = options || {};
			this.deferred = this.fetch();
		},
		signIn: function (options) {
			options = options || {};
			var that = this;
			window.gapi.auth.authorize({
				client_id: app.conf.googleapp.client_id,
				scope: options.scope || [
					'https://www.googleapis.com/auth/userinfo.email',
					'https://www.googleapis.com/auth/userinfo.profile'
				],
				immediate: false
			}, function (authResult) {
				if (authResult.error) {
					if (_.isFunction(options.error)) { options.error(); }
					return;
				} else {
					if (_.isFunction(options.success)) { options.success(authResult); }
				}
			});
		},
		getAuthStatus: function (options) {
			options = options || {};
			window.gapi.auth.authorize({
				client_id: app.conf.googleapp.client_id,
				scope: options.scope || [
					'https://www.googleapis.com/auth/userinfo.email',
					'https://www.googleapis.com/auth/userinfo.profile'
				],
				immediate: true
			}, function (authResult) {
				if (!authResult) {
					if (_.isFunction(options.error)) { options.error(authResult); }
					return;
				} else {
					if (_.isFunction(options.success)) { options.success(authResult); }
				}
			});
		}
	});
});
