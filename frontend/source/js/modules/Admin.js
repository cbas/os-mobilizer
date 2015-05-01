define([
	'jquery',
	'underscore',
	'backbone',
	'app',
	'bootstraptable',
	'modules/Devices',
	'modules/Projects',
	'modules/Settings',
	'socket.io',
	'validator',
	'validatoradd'
],
function (
	$, _, Backbone, app, bootstrapTable, Devices, Projects, Settings, io
) {
	var Models = {},
		Collections = {},
		Views = {};

	Views.Admin = Backbone.View.extend({
		template: this.template,
		events: {
			'click .show-detail': 'showDetail'
		},
		afterRender: function() {
			$('.admin-list-item').removeClass('selected');
			$('a#' + this.options.detail).parent().addClass('selected');
		},
		showDetail: function(e) {
			this.renderDetail(e.target.id);
		},
		renderDetail: function(detail) {
			var detailView = new Views.Detail({
				template: 'admin/' + detail,
				detail: detail
			});
			$('#admin-detail').html(detailView.render().view.el);
			detailView.render();
			window.history.pushState('', '', '/admin/' + detail);

			$('.admin-list-item').removeClass('selected');
			$('a#' + detail).parent().addClass('selected');
		}
	});

	Views.Detail = Backbone.View.extend({
		template: this.template,
		events: {
			'click .create-res': 'createRes',
			'click .update-res': 'updateRes',
			'click .res-new': 'newRes',
			'click-row.bs.table': 'showRes',
			'click .delete-res': 'deleteRes',
			'click .update-settings': 'updateSettings',
			'change #devicePlatform': 'devicePlatformChanged',
			'change #projectPlatform': 'projectPlatformChanged',
			'change #projectTesting': 'projectTestingChanged',
			'change #projectTestBuildSource': 'projectTestBuildSourceChanged'
		},
		afterRender: function() {
			$.validator.addMethod('noSpace', function(value, element) {
				return value.indexOf(' ') < 0 && value !== '';
			}, 'Space are not allowed.');

			$.validator.addMethod('uriRegex', function(value, element) {
				return this.optional(element) || /^[a-z0-9\-\s]+$/i.test(value);
			}, 'Uri must contain only letters, numbers, or dashes.');

			$.validator.addMethod('packageRegex', function(value, element) {
				return this.optional(element) || /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i.test(value);
			}, 'Please enter a valid package/identifier.');

			$('form#' + this.options.detail).validate({
				rules: {
					name: { required: true },
					repo: { required: true, noSpace: true },
					uri: { required: true, uriRegex: true, noSpace: true },
					package: { required: true, packageRegex: true, noSpace: true }
				},
				highlight: function(element) {
					$(element).closest('.form-group').addClass('has-error');
				},
				unhighlight: function(element) {
					$(element).closest('.form-group').removeClass('has-error');
				},
				errorElement: 'span',
				errorClass: 'help-block',
				errorPlacement: function(error, element) {
					if (element.parent('.input-group').length) {
						error.insertAfter(element.parent());
					} else {
						error.insertAfter(element);
					}
				}
			});

			if (this.options.detail === 'settings') {
				var that = this;
				var model = new Settings.Models.Settings();
				model.fetch({
					success: function(model, res) {
						that.populateForm(res);
					},
					error: function(model, res) {

					}
				});
			}

			$('table#' + this.options.detail).bootstrapTable({
				url: 'http:' + app.api(this.options.detail === 'testing' ? 'projects' : this.options.detail)
			}).on('load-success.bs.table', function (e, data) {
				// Remove any empty fields from view
				$('span.value').filter(function() {
					return $(this).html() === '-';
				}).parent().remove();
			});
		},
		serialize: function() {

		},
		devicePlatformChanged: function(e) {
			$('#deviceIpGroup').toggle(e.target.value === 'ios');
		},
		projectPlatformChanged: function(e) {
			$('#iosBuildFields').toggle(e.target.value === 'ios');
			if (e.target.value === 'android') {
				$('#projectTestBuildSource option[value=repo]').attr('disabled', 'disabled');
			} else {
				$('#projectTestBuildSource option[value=repo]').removeAttr('disabled');
			}
		},
		projectTestingChanged: function(e) {
			$('#testingFields').toggle(this.checked);
		},
		projectTestBuildSourceChanged: function(e) {
			$('#existingRepoFields').toggle(e.target.value === 'repo');
		},
		createRes: function(e) {
			e.preventDefault();

			if ($('form#' + this.options.detail).valid()) {
				var that = this;
				var model;

				if (this.options.detail === 'projects') {
					model = new Projects.Models.Project({
						params: $('form#' + this.options.detail).serialize()
					});
				} else if (this.options.detail === 'devices') {
					model = new Devices.Models.Device({
						params: $('form#' + this.options.detail).serialize()
					});
				}

				if (model) {
					model.save(null, {
						success: function() {
							$('.new-res').modal('hide');
							$('.new-res').on('hidden.bs.modal', function(e) {
								$('table#' + that.options.detail).bootstrapTable('refresh');

								if (that.options.detail === 'projects') {
									var complete = _.invoke([app.projects.android, app.projects.ios], 'fetch');
									$.when.apply($, complete).then(function() {
										app.session.trigger('sync');
									});
								}
							});
						},
						error: function(model, res) {
							$.bootstrapGrowl(res.responseJSON.msg, {type: 'danger'});
						}
					});
				} else {
					$.bootstrapGrowl('Unable to create ' + (this.options.detail === 'projects' ?
						'project.' : 'device.'), {type: 'danger'});
				}
			}
		},
		updateRes: function(e) {
			e.preventDefault();

			if ($('form#' + this.options.detail).valid()) {
				var that = this;
				var model;

				if (this.options.detail === 'projects') {
					model = new Projects.Models.Project({
						params: $('form#' + this.options.detail).serialize()
					});
				} else if (this.options.detail === 'devices') {
					model = new Devices.Models.Device({
						params: $('form#' + this.options.detail).serialize()
					});
				}

				if (model) {
					model.save(null, {
						type: 'PUT',
						success: function(res, model) {
							$('.new-res').modal('hide');
							$('.new-res').on('hidden.bs.modal', function(e) {
								$('table#' + that.options.detail).bootstrapTable('refresh');

								if (that.options.detail === 'projects') {
									var complete = _.invoke([app.projects.android, app.projects.ios], 'fetch');
									$.when.apply($, complete).then(function() {
										app.session.trigger('sync');
									});
								}
							});
						},
						error: function(model, res) {
							$.bootstrapGrowl(res.responseJSON.msg, {type: 'danger'});
						}
					});
				} else {
					$.bootstrapGrowl('Unable to update ' + (this.options.detail === 'projects' ?
						'project.' : 'device.'), {type: 'danger'});
				}
			}
		},
		newRes: function(e) {
			$('form#' + this.options.detail)[0].reset();
			$('.delete-res').hide();
			$('.new-res .modal-title').html('New ' + (this.options.detail === 'projects' ? 'Project' : 'Device'));
			$('.new-res .create-res').html('Create');
			if ($('.new-res .update-res')) {
				$('.new-res .update-res').toggleClass('update-res create-res');
			}
			$('.new-res').modal('show');

			if (this.options.detail === 'projects') {
				$('#testingFields').hide();
				$('#iosBuildFields').hide();
				$('#existingRepoFields').hide();
				$('#projectTestBuildSource option[value=repo]').attr('disabled', 'disabled');
			} else if (this.options.detail === 'devices') {
				$('#deviceIpGroup').hide();
			}
		},
		showRes: function(e, row) {
			$('form#' + this.options.detail)[0].reset();
			this.populateForm(row);
			$('.delete-res').show();
			$('.new-res .modal-title').html('Edit ' + (this.options.detail === 'projects' ? 'Project' : 'Device'));
			$('.new-res .create-res').html('Update');
			$('.new-res .create-res').toggleClass('create-res update-res');
			$('.new-res').modal('show');

			if (this.options.detail === 'projects') {
				$('#testingFields').toggle(row.testing);
				$('#iosBuildFields').toggle(row.platform === 'ios');
				$('#existingRepoFields').toggle(row.test_build_source === 'repo');
				if (row.platform === 'android') {
					$('#projectTestBuildSource option[value=repo]').attr('disabled', 'disabled');
				} else {
					$('#projectTestBuildSource option[value=repo]').removeAttr('disabled');
				}
			} else if (this.options.detail === 'devices') {
				$('#deviceIpGroup').toggle(row.platform === 'ios');
			}
		},
		deleteRes: function(e) {
			e.preventDefault();

			var that = this;
			var model;

			if (this.options.detail === 'projects') {
				model = new Projects.Models.Project({
					params: $('form#' + this.options.detail).serialize()
				});
			} else if (this.options.detail === 'devices') {
				model = new Devices.Models.Device({
					params: $('form#' + this.options.detail).serialize()
				});
			}

			if (model) {
				model.save(null, {
					type: 'DELETE',
					success: function(res, model) {
						$('.new-res').modal('hide');
						$('.new-res').on('hidden.bs.modal', function(e) {
							$('table#' + that.options.detail).bootstrapTable('refresh');

							if (that.options.detail === 'projects') {
								var complete = _.invoke([app.projects.android, app.projects.ios], 'fetch');
								$.when.apply($, complete).then(function() {
									app.session.trigger('sync');
								});
							}
						});
					},
					error: function(model, res) {
						$.bootstrapGrowl(res.responseJSON.msg, {type: 'danger'});
					}
				});
			} else {
				$.bootstrapGrowl('Unable to delete ' + (this.options.detail === 'projects' ?
					'project.' : 'device.'), {type: 'danger'});
			}
		},
		populateForm: function(obj) {
			var that = this;
			$.each(obj, function(name, val) {
				var $el = $('#' + that.options.detail + ' [name="'+name+'"]'),
				type = $el.attr('type');

				switch(type) {
				case 'checkbox':
					$el.prop('checked', val);
					break;
				case 'radio':
					$el.filter('[value="'+val+'"]').attr('checked', 'checked');
					break;
				default:
					$el.val(val);
				}
			});
		},
		updateSettings: function(e) {
			e.preventDefault();

			var model = new Settings.Models.Settings({
				params: $('form#' + this.options.detail).serialize()
			});
			model.save(null, {
				success: function(model, res) {
					$.bootstrapGrowl('Settings updated successfully.', {type: 'success'});
				},
				error: function(model, res) {
					$.bootstrapGrowl('Unable to update settings.', {type: 'danger'});
				}
			});
		}
	});

	return {
		Models: Models,
		Collections: Collections,
		Views: Views
	};

});