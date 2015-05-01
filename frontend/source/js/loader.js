require.config({

	waitSeconds: 15,

	baseUrl: '/js',

	deps: ['main'],

	paths: {
		async: '//cdnjs.cloudflare.com' +
			'/ajax/libs/async/1.22/async.min',
		backbone: '//cdnjs.cloudflare.com' +
			'/ajax/libs/backbone.js/1.0.0/backbone-min',
		handlebars: '//cdnjs.cloudflare.com' +
			'/ajax/libs/handlebars.js/3.0.1/handlebars.min',
		jquery: '//cdnjs.cloudflare.com' +
			'/ajax/libs/jquery/2.0.3/jquery.min',
		'jquery.cookie' : '//cdnjs.cloudflare.com' +
			'/ajax/libs/jquery-cookie/1.4.0/jquery.cookie.min',
		'backbone.layoutmanager': '//cdnjs.cloudflare.com' +
			'/ajax/libs/backbone.layoutmanager/0.8.8/backbone.layoutmanager.min',
		moment: '//cdnjs.cloudflare.com' +
			'/ajax/libs/moment.js/2.0.0/moment.min',
		'moment-timezone': '//cdnjs.cloudflare.com' +
			'/ajax/libs/moment-timezone/0.0.3/moment-timezone.min',
		underscore: '//cdnjs.cloudflare.com' +
			'/ajax/libs/underscore.js/1.4.4/underscore-min',
		'socket.io': '//cdnjs.cloudflare.com' +
			'/ajax/libs/socket.io/0.9.16/socket.io.min',
		'notify': 'https://cdn.jsdelivr.net/jquery.notification/1.0.3/jquery.notification.min',
		modernizr: 'libs/modernizr',
		bootstrap: '//cdnjs.cloudflare.com' +
			'/ajax/libs/twitter-bootstrap/3.1.1/js/bootstrap.min',
		ace: 'libs/ace',
		bootstraptable: '//cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.7.0/bootstrap-table.min',
		validator: '//cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.11.1/jquery.validate.min',
		validatoradd: '//cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.11.1/additional-methods.min',
		growl: '//cdnjs.cloudflare.com/ajax/libs/bootstrap-growl/1.0.0/jquery.bootstrap-growl.min',
		ansi: 'libs/ansi_up'
	},

	shim: {
		backbone: {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		handlebars: {
			exports: 'Handlebars'
		},
		jquery: {
			exports: 'jQuery'
		},
		'backbone.layoutmanager': ['backbone'],
		underscore: {
			exports: '_'
		},
		notify: ['jquery'],
		bootstrap: ['jquery'],
		'jquery.cookie' : ['jquery'],
		growl: ['jquery'],
		bootstraptable: ['jquery'],
		validator: ['jquery'],
		validatoradd: ['jquery']
	}

});
