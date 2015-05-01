define([
	'ace/ace',
	'jquery',
	'underscore',
	'backbone',
	'app',
	'socket.io',
	'notify',

	'modules/Runs',
	'modules/TestFeatures',
	'modules/Codesign',
	'ansi'
],
function (
	ace, $, _, Backbone, app, io, notify, Runs, TestFeatures, Codesign
) {
	var Models = {},
		Collections = {},
		Views = {};
	var isFeatureNew = false;
	var activeTab;
	var uniqueId = Date.now();
	var tailingLogId;
	var scrollX;
	var scrollY;

	$.expr[':'].containsexactly = function(obj, index, meta, stack) {
		return $(obj).text() === meta[3];
	};

	Models.Release = Backbone.Model.extend();

	Collections.Releases = Backbone.Model.extend({
		model: Models.Release,
		url: function() {
			return app.api('releases/' + this.get('platform') + '/' + this.get('repo'));
		}
	});

	Views.Releases = Backbone.View.extend({
		template: this.template,
		initialize: function() {
			this.listenTo(this.collection, 'sync', this.render);
		},
		events: {
			'change select': 'sorting',
			'click #branch': 'testBranchSelected',
			'click #appver': 'testReleaseSelected',
			'click #device': 'testDeviceSelected',
			'click #testcase': 'testCaseSelected',
			'click #startTest': 'startTest',
			'click .repeat-test': 'restartTest',
			'click .cancel-test': 'cancelTest',
			'click .show-feature': 'showFeatureContents',
			'click .editor-update': 'updateFeatureContents',
			'click .editor-new': 'newFeatureContent',
			'click .editor-delete-confirm': 'deleteFeatureContent',
			'click .ios-ota': 'downloadOta',
			'shown.bs.collapse .panel-collapse': 'onTestResultExpanded',
			'click .tailLog': 'tailLog'
		},
		beforeRender: function() {
			// Remember last known scroll positions
			scrollX = window.scrollX;
			scrollY = window.scrollY;
		},
		afterRender: function() {
			var that = this;

			$('#zipProgress').hide();
			$('#zipFiles').hide();
			$('#apkProgress').hide();
			$('#apkFiles').hide();
			$('#collapseOne').collapse({
				toggle: false
			});
			$('.app-options').click(function() {
				$(this).parent().find('a').removeClass('active');
				$(this).addClass('active');

				if ($(this).attr('href') === '#upload-app') {
					app.selectedAppType = 'apk';
				} else {
					app.selectedAppType = 'release';
				}

				that.restoreState();
			});

			$('.upload-options').click(function() {
				$(this).parent().find('a').removeClass('active');
				$(this).addClass('active');

				if ($(this).attr('href') === '#github') {
					app.selectedTestSource = 'github';
					if (app.uploadTestFile) {
						app.selectedTestCase = {name: 'All tests', test: 'All tests', local_path: 'All'};
					}
				} else {
					app.selectedTestSource = 'zip';
					if (app.uploadTestFile) {
						app.selectedTestCase = app.testCases[0];
					}
				}

				that.restoreState();
			});

			app.socket.removeAllListeners();
			app.socket.on('stream', function(data) {
				$('#' + data.id).find('.tailLog').offset({top: $('#' + data.id).find('.tailLog').parent().top + 20,
					left: $('#' + data.id).parent().position().left +
						$('#' + data.id).parent().width() - $('.tailLog').width() - 20});
				$('#' + data.id).find('.tailLog').show();
				$('#' + data.id).find('.console-output').html($('#' + data.id).find('.console-output').html() +
					ansi_up.ansi_to_html(data.data)); // jshint ignore:line

				if (parseInt(tailingLogId) === data.id) {
					var bottom = $('#' + data.id).find('.console-output').position().top +
								$('#' + data.id).find('.console-output').outerHeight(true);

					window.scrollTo(0, bottom);
					setTimeout(function() {
						tailingLogId = data.id;
					}, 500);
				}
			});
			app.socket.on('done', function(data) {
				$('a[href=#' + data.data.id + ']').parent().find('a.cancel-test').remove();

				if (data.status === 'passed') {
					$('a[href=#' + data.data.id + ']').find('i').
					replaceWith('<span class="glyphicon glyphicon-ok green"></span>');
				} else {
					$('a[href=#' + data.data.id + ']').find('i').
					replaceWith('<span class="glyphicon glyphicon-remove red"></span>');
					$('a[href=#' + data.data.id + ']').parent().
					append('<a class="glyphicon glyphicon-repeat repeat-test" style="float:right" ' +
						'id="test_' + data.data.id + '" href="#"></a>');
				}

				var options = {
					iconUrl: '//' + window.location.host + '/img/favicon.ico',
					title: 'Calabash Test ' + data.status.charAt(0).toUpperCase() + data.status.slice(1)
				};

				$.notification(options).then(function(notification) {
					setTimeout(function () {
						notification.close();
					}, 5000);
				});
			});

			$('#apkUpload').fileupload({
				url: app.api('test/new?type=apk&id=' + uniqueId),
				retryTimeout: 5000,
				done: function (e, data) {
					$.each(data.result.files, function (index, file) {
						$('#apkFiles').empty();
						$('#apkFiles').show();
						$('#apkProgress').hide();
						app.uploadTestApk = file.name;
					});

					that.restoreState();
				},
				progressall: function (e, data) {
					$('#apkProgress').show();

					var progress = parseInt(data.loaded / data.total * 100, 10);
					$('#apkProgress .progress-bar').css(
					'width',
					progress + '%'
					);
				}
			}).prop('disabled', !$.support.fileInput)
			.parent().addClass($.support.fileInput ? undefined : 'disabled');

			$('#zipUpload').fileupload({
				url: app.api('test/new?type=zip&id=' + uniqueId),
				retryTimeout: 5000,
				done: function (e, data) {
					data.result.testCases.splice(0, 0, {name: 'All tests', test: 'All tests', local_path: 'All'});
					app.testCases = data.result.testCases;
					app.selectedTestCase = data.result.testCases[0];

					$.each(data.result.files, function (index, file) {
						$('#zipFiles').empty();
						$('#zipFiles').show();
						$('#zipProgress').hide();
						app.uploadTestFile = file.name;
					});

					that.restoreState();
				},
				progressall: function (e, data) {
					$('#zipProgress').show();

					var progress = parseInt(data.loaded / data.total * 100, 10);
					$('#zipProgress .progress-bar').css(
					'width',
					progress + '%'
					);
				}
			}).prop('disabled', !$.support.fileInput)
			.parent().addClass($.support.fileInput ? undefined : 'disabled');

			app.editor = ace.edit('editor');
			app.editor.setOption('minLines', 100);
			app.editor.$blockScrolling = Infinity;
			app.editor.getSession().on('change', function(e) {
				if (app.editor.getValue().length > 0) {
					$('.editor-update').removeAttr('disabled');
				} else {
					$('.editor-update').attr('disabled', 'disabled');
				}
			});
			$('.ace_print-margin').hide();
			$('.editor-update').hide();
			$('.editor-delete').hide();
			$('.editor').hide();
			$('.filename-input').hide();

			this.validateTestEligibility();

			// Show first tab on initial render
			if (!activeTab) {
				$('.branches a:first').tab('show');
				$('.branches a:first').on('shown', function(e) {
					activeTab = e.target;
				});
			}

			window.addEventListener('scroll', this.scrollListener, false);

			// Restore scroll positions after render
			window.scrollTo(scrollX, scrollY);
		},
		serialize: function () {
			var filteredReleases = [];
			var project = this.options.project;
			var testRuns = this.options.runs;
			var releases = this.collection.get('releases');
			var activeBranches = this.options.branches;
			var allBranches = Object.keys(releases);
			var miscBranches = _.without(JSON.parse(JSON.stringify(allBranches)), 'master', 'develop');
			var testDevices = this.options.devices;
			var testFeatures = this.options.testFeatures;
			var testFeatureDefinitions = this.options.testFeatureDefinitions;
			var testFeatureSupport = this.options.testFeatureSupport;
			var filteredTestFeatures = [{name: 'All tests', test: 'All tests', local_path: 'All'}];

			if (!app.selectedAppType) {
				app.selectedAppType = 'release';
			}

			if (!app.selectedTestDevice && testDevices.length > 0) {
				app.selectedTestDevice = testDevices[0];
			}

			if (!app.selectedTestSource) {
				app.selectedTestSource = 'github';
			}

			for (var j = 0; j < miscBranches.length; j+=1) {
				var found = false;

				for (var k = 0; k < activeBranches.length; k+=1) {
					if (miscBranches[j].indexOf('release/') !== -1 ||
						miscBranches[j].indexOf('hotfix/') !== -1 ||
						miscBranches[j] === activeBranches[k].name) {
						found = true;
					}
				}

				if (!found) {
					miscBranches.splice(j,1);
					j-=1;
				}
			}

			if (testFeatures) {
				for(var i = 0; i < testFeatures.length; i+=1) {
					if (testFeatures[i].type !== 'file') {
						testFeatures.splice(i,1);
						i-=1;
					}
				}

				if (Array.isArray(testFeatureDefinitions)) {
					testFeatures = testFeatures.concat(testFeatureDefinitions);
				}
				if (Array.isArray(testFeatureSupport)) {
					testFeatures = testFeatures.concat(testFeatureSupport);
				}

				for (i = 0; i < testFeatures.length; i+=1) {
					if (testFeatures[i].path.indexOf('step_definitions') === -1 &&
						testFeatures[i].path.indexOf('support') === -1) {
						if (app.selectedTestDevice && app.selectedTestDevice.type === 'tablet') {
							if (testFeatures[i].path.indexOf('tablet_') !== -1) {
								filteredTestFeatures.push(testFeatures[i]);
							}
						} else {
							if (testFeatures[i].path.indexOf('tablet') === -1) {
								filteredTestFeatures.push(testFeatures[i]);
							}
						}
					}
				}
			}

			if (miscBranches) {
				if (!app.currentBranch) {
					app.currentBranch = miscBranches[0];
				}
			}

			if (!app.selectedTestBranch) {
				app.selectedTestBranch = allBranches[0];
			}

			if (!app.selectedTestCase) {
				if (app.selectedTestSource === 'github') {
					if (testFeatures.length > 0) {
						app.selectedTestCase = filteredTestFeatures[0];
					}
				} else {
					if (app.testCases) {
						app.testCases.forEach(function(testCase, index) {
							if (testCase.name === app.selectedTestCase.name) {
								app.selectedTestCase = testCase;
							}
						});
					}
				}
			}

			if (!$.isEmptyObject(releases)) {
				filteredReleases = JSON.parse(JSON.stringify(releases[app.selectedTestBranch]));

				// Remove release if it does not contain either alpha or beta builds
				for (var m = 0; m < filteredReleases.length; m+=1) {
					var release = filteredReleases[m];
					if (!release.alpha && !release.beta) {
						filteredReleases.splice(m,1);
						m-=1;
					}
				}

				if (!app.selectedTestRelease && filteredReleases.length > 0) {
					app.selectedTestRelease = filteredReleases[0];
				}
			}

			if (testRuns.length > 0) {
				testRuns.forEach(function(run, index) {
					if (run.logData) {
						var log = '';
						for (var command in run.logData) {
							if (run.logData.hasOwnProperty(command)) {
								log += run.logData[command];
							}
						}
						run.logData = ansi_up.ansi_to_html(log);  // jshint ignore:line
					}
				});
			}

			return {
				master : releases.master ? releases.master : [],
				develop : releases.develop ? releases.develop : [],
				feature : releases[app.currentBranch],
				testReleases : filteredReleases,
				miscBranches: miscBranches,
				allBranches : allBranches,
				currentBranch: app.currentBranch,
				project : project,
				testDevices: testDevices,
				testCases: app.testCases,
				testRuns: testRuns,
				testFeatures: testFeatures,
				filteredTestFeatures: filteredTestFeatures,
				selectedTestFeature: app.selectedTestFeature,
				selectedTestBranch: app.selectedTestBranch,
				selectedTestRelease: app.selectedTestRelease,
				selectedTestDevice: app.selectedTestDevice,
				selectedTestCase: app.selectedTestCase,
				selectedTestFeatureContent: app.selectedTestFeatureContent,
				selectedTestSource: app.selectedTestSource,
				settings: this.options.settings
			};
		},
		renderRelease: function() {
			this.render();
			this.$el.find('.branches a[href=#feature]').tab('show');
			this.$el.find('.sorting select').val(app.currentBranch);
		},
		sorting: function(e) {
			var that = this;
			app.currentBranch = $(e.currentTarget).val();
			this.renderRelease();
		},
		testBranchSelected: function(e) {
			var selBranch = e.target.innerText;
			app.selectedTestBranch = selBranch;
			delete app.selectedTestRelease;
			this.restoreState();
		},
		testReleaseSelected: function(e) {
			app.selectedTestRelease = $(e.target).data('release');
			this.restoreState();
		},
		testDeviceSelected: function(e) {
			if (e.target.tagName === 'A') {
				// Reload test cases to reflect device type
				if (app.selectedTestDevice.tablet !== $(e.target).data('device').tablet) {
					delete app.selectedTestCase;
				}
				app.selectedTestDevice = $(e.target).data('device');

				this.restoreState();
			}
		},
		testCaseSelected: function(e) {
			app.selectedTestCase = $(e.target).data('test');
			this.restoreState();
		},
		startTest: function(e) {
			var that = this;
			var model = new Runs.Models.Run({
				platform: that.options.platform,
				repo: that.options.repo,
				release: app.selectedTestRelease
			});
			model.save(null, {
				success: function() {
					var runs = new Runs.Collections.Runs({
						platform: that.options.platform,
						repo: that.options.repo
					});
					runs.fetch({
						success: function() {
							delete app.testCases;
							delete app.uploadTestFile;
							delete app.uploadTestApk;
							delete app.selectedAppType;

							that.options.runs = runs.get('testRuns');

							that.render();
							that.$el.find('.branches a:last').tab('show');
							that.$el.find('#testtabs a:last').tab('show');
						}
					});
				}
			});
		},
		restartTest: function(e) {
			var that = this;
			var run = new Runs.Models.Run({
				id: e.target.id.replace('test_', ''),
				platform: that.options.platform,
				repo: that.options.repo,
				release: $(e.target).data('release')
			});

			run.save(null, {
				type: 'PUT',
				success: function() {
					var runs = new Runs.Collections.Runs({
						platform: that.options.platform,
						repo: that.options.repo
					});
					runs.fetch({
						success: function() {
							delete app.testCases;
							delete app.uploadTestFile;
							delete app.uploadTestApk;
							delete app.selectedAppType;

							that.options.runs = runs.get('testRuns');

							that.render();
							that.$el.find('.branches a:last').tab('show');
							that.$el.find('#testtabs a:last').tab('show');
						}
					});
				}
			});
		},
		cancelTest: function(e) {
			var that = this;
			var run = new Runs.Models.Run({
				id: e.target.id.replace('test_', ''),
				cancel: true,
				release: $(e.target).data('release')
			});

			run.save(null, {
				type: 'POST',
				success: function() {
					var runs = new Runs.Collections.Runs({
						platform: that.options.platform,
						repo: that.options.repo,
					});
					runs.fetch({
						success: function() {
							that.options.runs = runs.get('testRuns');

							that.render();
							that.$el.find('.branches a:last').tab('show');
							that.$el.find('#testtabs a:last').tab('show');
						}
					});
				},
				error: function(model, res) {
					$.bootstrapGrowl(res.responseJSON.msg, {type: 'danger'});
				}
			});
		},
		showFeatureContents: function(e) {
			app.selectedTestFeature = e.target.innerText;
			var that = this;
			var featureContent = new TestFeatures.Collections.TestFeatures({
				path: e.target.id,
				content: '',
				sha: '',
				message: '',
				committer: {
					name: app.session.get('displayName'),
					email: app.session.get('email')
				}
			});

			$('.editor-update').attr('disabled','disabled');
			$('.editor-new').attr('disabled','disabled');
			$('#featureFileName').attr('disabled', 'disabled');
			$('.file-list-item').removeClass('selected');
			$('a:containsexactly(' + app.selectedTestFeature + ')').parent().addClass('selected');
			$('.filename-input').hide();
			$('.editor-update').hide();
			$('.editor-delete').hide();
			$('.editor').hide();
			$('.editor-status').show();
			$('.editor-status').html('Loading feature file...');
			$('.editor-update').show();
			isFeatureNew = false;

			featureContent.fetch({
				success: function(model, res) {
					app.selectedTestFeatureContent = atob(res.testFeatures.content);
					app.selectedTestFeatureContentSHA = res.testFeatures.sha;
					app.editor.setValue(app.selectedTestFeatureContent, -1);

					$('.editor-update').removeAttr('disabled');
					$('.editor-new').removeAttr('disabled');
					$('.file-list-item').removeClass('selected');
					$('a:containsexactly(' + app.selectedTestFeature + ')').parent().addClass('selected');
					$('#featureFileName').attr('value', res.testFeatures.path.replace(/.*\/features\//, '')
						.replace('.feature', '').replace('.rb', ''));
					$('.editor-status').hide();
					$('.filename-input').show();
					$('.editor-update').html('Update');
					$('.editor-update').attr('id', e.target.id);
					$('.editor-delete-confirm').attr('id', e.target.id);
					$('.editor').show();
					$('.editor-new').show();
					$('.editor-delete').show();
					$('.featureFileExt').html(res.testFeatures.name.indexOf('.rb') !== -1 ? '.rb' : '.feature');
				},
				error: function() {
					$('.editor-new').removeAttr('disabled');
					$('.editor-status').html('Error loading feature file.');
					$('.editor-new').show();
				}
			});
		},
		updateFeatureContents: function(e) {
			$('#featureFileName').attr('disabled', 'disabled');
			$('.editor-update').attr('disabled','disabled');
			$('.editor-delete').attr('disabled','disabled');
			$('.editor-update').html(isFeatureNew ? 'Creating...' : 'Updating...');
			$('.editor-status').html('');

			var that = this;
			var featureContent = new TestFeatures.Collections.TestFeatures({
				content: btoa(app.editor.getValue()),
				sha: app.selectedTestFeatureContentSHA,
				path: isFeatureNew ? that.options.repo + '/features/' + $('#featureFileName').val() + '.feature' : e.target.id,
				message: (isFeatureNew ? 'Created ' : 'Updated ') + $('#featureFileName').val() +
				' calabash ' + ($('#featureFileName').val().indexOf('.rb') !== -1 ? 'definitions' : 'features') +
				' file [ci skip]',
				committer: {
					name: app.session.get('displayName'),
					email: app.session.get('email')
				}
			});

			featureContent.save(null, {
				type: 'PUT',
				success: function(model, res) {
					app.selectedTestFeatureContent = app.editor.getValue();
					app.selectedTestFeatureContentSHA = res.testFeatures.content.sha;
					if (isFeatureNew) {
						app.selectedTestFeature = $('#featureFileName').val() + '.feature';
						isFeatureNew = false;
					}

					that.refreshFeatureContent(function() {
						that.render();
						that.$el.find('.branches a:last').tab('show');
						that.$el.find('#testtabs a:eq(1)').tab('show');

						app.editor.setValue(app.selectedTestFeatureContent, -1);
						app.editor.focus();
						$('#featureFileName').attr('disabled', 'disabled');
						$('.editor-update').removeAttr('disabled');
						$('.editor-new').removeAttr('disabled');
						$('.file-list-item').removeClass('selected');
						$('a:containsexactly(' + app.selectedTestFeature + ')').parent().addClass('selected');
						$('#featureFileName').attr('value', app.selectedTestFeature.replace('.feature', '').replace('.rb', ''));
						$('.editor-status').hide();
						$('.filename-input').show();
						$('.editor-update').html('Update');
						$('.editor-update').attr('id', res.testFeatures.content.path);
						$('.editor-delete-confirm').attr('id', res.testFeatures.content.path);
						$('.editor').show();
						$('.editor-update').show();
						$('.editor-new').show();
						$('.editor-delete').show();
						$('.featureFileExt').html(app.selectedTestFeature.indexOf('.rb') !== -1 ? '.rb' : '.feature');
					});
				},
				error: function() {
					$('#featureFileName').removeAttr('disabled');
					$('.editor-update').removeAttr('disabled');
					$('.editor-delete').removeAttr('disabled');
					$('.editor-update').html('Update');
					$('.editor-status').html('Error updating. Please try again.');
				}
			});
		},
		deleteFeatureContent: function(e) {
			var that = this;
			var featureContent = new TestFeatures.Collections.TestFeatures({
					content: btoa(app.editor.getValue()),
					sha: app.selectedTestFeatureContentSHA,
					path: e.target.id,
					message: 'Deleted ' + $('#featureFileName').val() + ' calabash feature file [ci skip]',
					committer: {
						name: app.session.get('displayName'),
						email: app.session.get('email')
					}
				});

			featureContent.save(null, {
				type: 'DELETE',
				success: function() {
					delete app.selectedTestFeatureContent;
					delete app.selectedTestFeatureContentSHA;

					that.refreshFeatureContent(function() {
						that.render();
						that.$el.find('.branches a:last').tab('show');
						that.$el.find('#testtabs a:eq(1)').tab('show');
					});
				},
				error: function() {
					$('#featureFileName').removeAttr('disabled');
					$('.editor-update').removeAttr('disabled');
					$('.editor-delete').removeAttr('disabled');
					$('.editor-update').html('Update');
					$('.editor-status').html('Error updating. Please try again.');
				}
			});
		},
		newFeatureContent: function(e) {
			app.editor.setValue('');
			app.editor.focus();
			$('#featureFileName').removeAttr('value');
			$('#featureFileName').removeAttr('disabled');
			$('.featureFileExt').html('.feature');
			$('.editor-status').hide();
			$('.filename-input').show();
			$('.file-list-item').removeClass('selected');
			$('.editor-update').attr('disabled','disabled');
			$('.editor-new').hide();
			$('.editor-update').html('Create feature');
			$('.editor-update').show();
			$('.editor-delete').hide();
			$('.editor').show();
			isFeatureNew = true;
		},
		refreshFeatureContent: function(callback) {
			var that = this;
			var features = new TestFeatures.Collections.TestFeatures({
				path: that.options.repo + '/features'
			});

			var featureDefinitions = new TestFeatures.Collections.TestFeatures({
				path: that.options.repo + '/features/step_definitions'
			});

			var featureSupport = new TestFeatures.Collections.TestFeatures({
				path: that.options.repo + '/features/support'
			});

			$.ajaxSetup({ cache: false });

			var complete = _.invoke([features, featureDefinitions, featureSupport], 'fetch');

			$.when.apply($, complete).done(function() {
				that.options.testFeatures = features.get('testFeatures');
				that.options.testFeatureDefinitions = featureDefinitions.get('testFeatures');
				that.options.testFeatureSupport = featureSupport.get('testFeatures');
				$.ajaxSetup({ cache: true });
				callback();
			});
		},
		downloadOta: function(e) {
			e.target.setAttribute('disabled', 'disabled');
			e.target.innerHTML = '<i class="fa fa-spinner fa-spin"></i>  ' + e.target.innerHTML;
			var codesign = new Codesign.Models.Codesign({
				build: e.target.id,
				type: e.target.type
			});
			codesign.fetch({
				success: function(model, res) {
					e.target.removeAttribute('disabled');
					e.target.innerHTML = e.target.innerHTML.replace('<i class="fa fa-spinner fa-spin"></i>  ', '');
					window.location.href = res.url;
				},
				error: function(model, res) {
					alert(res.responseJSON.msg);
					e.target.removeAttribute('disabled');
					e.target.innerHTML = e.target.innerHTML.replace('<i class="fa fa-spinner fa-spin"></i>  ', '');
				}
			});
		},
		onTestResultExpanded: function(e) {
			$(e.target).find('.tailLog').offset({top: $(e.target).position().top + 10, 
				left: $(e.target).position().left + $(e.target).width() - $(e.target).find('.tailLog').width() - 20});
			$(e.target).find('.tailLog').show();
		},
		tailLog: function(e) {
			var bottom = $('#' + e.target.id + ' .console-output').position().top +
					$('#' + e.target.id + ' .console-output').outerHeight(true);
			window.scrollTo(0, bottom);
			setTimeout(function() {
				tailingLogId = e.target.id;
			}, 500);
		},
		scrollListener: function() {
			if ($('.tailLog').length > 0) {
				$('.tailLog').offset({top: $('.tailLog').parent().top + 10, 
					left: $('.tailLog').parent().position().left + $('.tailLog').parent().width() - $('.tailLog').width() - 20});
				
				if ($('.tailLog').parent().offset().top - $(window).scrollTop() <= 50) {
					$('.tailLog').offset({top: $(window).scrollTop() + 60});					
				} else {
					$('.tailLog').offset({top: $('.tailLog').parent().position().top + 10});
				}
			}

			tailingLogId = null;
		},
		restoreState: function() {
			this.render();
			this.$el.find('.branches a:last').tab('show');

			if (app.selectedAppType === 'apk') {
				this.$el.find('#appoptionstab a').removeClass('active');
				this.$el.find('#appoptionstab a:last').addClass('active');
				this.$el.find('#appoptionstab a:last').tab('show');

				if (app.selectedTestSource === 'zip') {
					if (app.uploadTestFile) {
						$('#zipFiles').show();
						$('#zipFiles').empty();
						$('<p/>').text('Uploaded ' + app.uploadTestFile + ' successfully.').appendTo('#zipFiles');
					}
				}

				if (app.uploadTestApk) {
					$('#apkFiles').show();
					$('#apkFiles').empty();
					$('<p/>').text('Uploaded ' + app.uploadTestApk + ' successfully.').appendTo('#apkFiles');
				}
			} else {
				if (app.selectedTestSource === 'zip') {
					this.$el.find('#uploadoptionstab a').removeClass('active');
					this.$el.find('#uploadoptionstab a:last').addClass('active');
					this.$el.find('#uploadoptionstab a:last').tab('show');

					if (app.uploadTestFile) {
						$('#zipFiles').show();
						$('#zipFiles').empty();
						$('<p/>').text('Uploaded ' + app.uploadTestFile + ' successfully.').appendTo('#zipFiles');
					}
				}
			}

			this.validateTestEligibility();
		},
		validateTestEligibility: function() {
			if (((app.selectedAppType === 'apk' && app.uploadTestApk) ||
				app.selectedAppType === 'release' && app.selectedTestRelease) &&
				app.selectedTestDevice && app.selectedTestCase) {
				$('#startTest').removeAttr('disabled');
			} else {
				$('#startTest').attr('disabled', 'disabled');
			}
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});