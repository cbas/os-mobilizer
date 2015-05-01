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

	Collections.Runs = Backbone.Model.extend({
		model: Models.Run,
		url: function() {
			return app.api('test/' + this.get('repo'));
		},
		parse: function(res) {
			this.set({ testRuns : res });

			return this;
		}
	});

	Models.Run = Backbone.Model.extend({
		url: function() {
			if (this.get('cancel')) {
				return app.api('test/cancel/' + this.get('id'));
			} else {
				var selectedTestRelease = this.get('release');

				var appUrl = selectedTestRelease.alpha ? selectedTestRelease.alpha_download_link :
					selectedTestRelease.beta_download_link;
				var appName = selectedTestRelease.alpha ? selectedTestRelease.name + ' [Alpha]' :
					selectedTestRelease.name + ' [Beta]';

				return app.api('test/' + this.get('platform') + '/' + this.get('repo') + (this.get('id') ? '/' +
					this.get('id') : '') + '?appUrl=' + appUrl + '&appName=' +
					(app.selectedAppType === 'apk' ? app.uploadTestApk : appName) +
					'&testReleaseEnv=' + (selectedTestRelease.alpha ? 'alpha' : 'beta') +
					'&testCase=' + app.selectedTestCase.local_path + '&testType=' + app.selectedAppType +
					'&testTag=' + selectedTestRelease.tag_name + '&testSource=' + app.selectedTestSource) +
					(app.selectedTestDevice ? '&testDeviceId=' + app.selectedTestDevice._id : '') + '&manual=true';
			}
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});