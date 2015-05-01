define([
	'jquery', 'underscore', 'backbone', 'app',
	'modules/Landing',
	'modules/Releases',
	'modules/Projects',
	'modules/Devices',
	'modules/Branches',
	'modules/TestFeatures',
	'modules/Runs',
	'modules/Layouts',
	'modules/Admin',
	'modules/Settings',
	'moment'
], function (
	$, _, Backbone, app,
	Landing,
	Releases,
	Projects,
	Devices,
	Branches,
	TestFeatures,
	Runs,
	Layouts,
	Admin,
	Settings,
	Moment
) {

	var redirectURL;

	return Backbone.Router.extend({

		routes: {
			'': 'landing',
			'android/:project': 'project',
			'ios/:project': 'project',
			'logout': 'logout',
			'admin': 'admin',
			'admin/:detail': 'admin',

			'*path': '404'
		},
		auth: {
			notLoggedIn: [
				'android/:project', 'android'
			]
		},
		initialize: function () {
			var that = this;

			this.on('route', function (route) {
				window.scrollTo(0, 0);
				route = route || this.routes[Backbone.history.fragment];
			});

			app.session.on('sync', function () {
				if (app.session.has('email') && app.session.attributes.authorized) {
					if (redirectURL) {
						that.navigate(redirectURL, {replace: true, trigger: true});
					}
				} else {
					that.unauthorized();
				}
			});
		},

		landing: function () {
			if (app.session.has('email') && typeof $.cookie('access_token') !== 'undefined') {
				if (redirectURL) {
					this.navigate(redirectURL, {replace: true, trigger: true});
				}
			} else {
				app.useLayout(Layouts.Views.Wide)
					.setViews({
						'#content': new Landing.Views.Landing()
					}).render();
			}
		},

		unauthorized: function() {
			app.useLayout(Layouts.Views.Unauthorized)
				.setViews({
					'#content': new Landing.Views.Unauthorized()
				}).render();
		},

		notFound: function() {
			app.useLayout(Layouts.Views.Wide)
				.setViews({
					'#content': new Landing.Views.NotFound()
				}).render();
		},

		project: function(uri) {
			if (app.session.has('email') && typeof $.cookie('access_token') !== 'undefined') {
				delete app.testCases;
				delete app.uploadTestFile;
				delete app.uploadTestApk;
				delete app.currentBranch;
				delete app.selectedTestDevice;
				delete app.selectedAppType;
				delete app.selectedTestRelease;
				delete app.selectedTestBranch;
				delete app.selectedTestCase;
				delete app.selectedTestFeature;
				delete app.selectedTestFeatureContent;
				delete app.selectedTestFeatureContentSHA;
				delete app.selectedTestSource;

				var url = Backbone.history.location.href;
				var that = this;

				var project = new Projects.Collections.Projects({
					platform: url.indexOf('android') !== -1 ? 'android' : 'ios',
					uri: uri
				});
				project.fetch({
					success: function(proj) {
						if (!proj.get('projects')) {
							that.notFound();
							return;
						}

						var releases = new Releases.Collections.Releases({
							repo: proj.get('projects').repo,
							platform: proj.get('projects').platform
						});

						var branches = new Branches.Collections.Branches({
							repo: proj.get('projects').repo,
							platform: proj.get('projects').platform
						});

						var features = new TestFeatures.Collections.TestFeatures({
							path: proj.get('projects').repo + '/features'
						});

						var featureDefinitions = new TestFeatures.Collections.TestFeatures({
							path: proj.get('projects').repo + '/features/step_definitions'
						});

						var featureSupport = new TestFeatures.Collections.TestFeatures({
							path: proj.get('projects').repo + '/features/support'
						});

						var devices = new Devices.Collections.Devices({
							platform: proj.get('projects').platform
						});

						var runs = new Runs.Collections.Runs({
							repo: proj.get('projects').repo
						});

						var settings = new Settings.Models.Settings();

						releases.fetch({
							success: function() {
								var complete = _.invoke([branches, devices, runs, features, featureDefinitions,
									featureSupport, settings], 'fetch');

								$.when.apply($, complete).then(function() {
									renderView(proj, branches, releases, devices, runs, features, featureDefinitions,
												featureSupport, settings);
								}, function() {
									renderView(proj, branches, releases, devices, runs, features, featureDefinitions,
												featureSupport, settings);
								});
							}
						});
						app.title.setTitle('Mobilizer - ' +
							(url.indexOf('android') !== -1 ? 'Android' : 'iOS') + ' | Mobilizer');
					}
				});

				var renderView = function(proj, branches, releases, devices, runs, features, featureDefinitions,
					featureSupport, settings) {
					app.useLayout(Layouts.Views.Wide).setViews({
						'#content': new Releases.Views.Releases({
							template: 'projects/main',
							collection: releases,
							branches: branches.get('branches'),
							devices: devices.get('devices'),
							runs: runs.get('testRuns'),
							testFeatures: features.get('testFeatures'),
							testFeatureDefinitions: featureDefinitions.get('testFeatures'),
							testFeatureSupport: featureSupport.get('testFeatures'),
							platform: proj.get('projects').platform,
							repo: proj.get('projects').repo,
							project: proj.get('projects'),
							settings: settings.get('settings')
						})
					}).render();
				};
			} else {
				redirectURL = window.location.pathname;
				this.navigate('/', { replace: true, trigger: true });
			}
		},

		admin: function(detail) {
			if (app.session.has('email') && typeof $.cookie('access_token') !== 'undefined') {
				if (detail) {
					app.useLayout(Layouts.Views.Wide).setViews({
							'#content': new Admin.Views.Admin({
								template: 'admin/main',
								detail: detail
							}),
							'#admin-detail': new Admin.Views.Detail({
								template: 'admin/' + detail,
								detail: detail
							})
						}).render();
				} else {
					app.useLayout(Layouts.Views.Wide).setViews({
							'#content': new Admin.Views.Admin({
								template: 'admin/main'
							})
						}).render();
				}
			} else {
				redirectURL = window.location.pathname;
				this.navigate('/', { replace: true, trigger: true });
			}
		},

		logout: function() {
			$.removeCookie('access_token');
			this.navigate('/', { replace: true, trigger: true });
		},

		404: function () {
			this.navigate('/', { replace: true, trigger: true });
		}
	});
});
