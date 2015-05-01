define([
	'express', 'cors', 'express-handlebars', 'body-parser'
], function(express, cors, hbs, bodyParser) {
	return function (app, conf) {

		var corsOpts = {
			origin: 'http://localhost:9081',
			credentials: true
		};

		var allowCrossDomain = function(req, res, next) {
		   res.header('Access-Control-Allow-Origin', '*');
		   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
		   res.header('Access-Control-Allow-Headers', 'Content-Type');

		   next();
		};

		app.set('showStackError', true);

		app.configure(function () {
			app.use(express.favicon());
			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({ extended: true }));
			app.use(express.methodOverride());
			app.use(express.cookieParser());
			app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));

			app.use(express.static(GLOBAL.process.env.PWD + '/public'));

    		app.set('views', GLOBAL.process.env.PWD + '/app/views');
			app.engine('handlebars', hbs({
				defaultLayout: GLOBAL.process.env.PWD + '/app/views/layouts/index'
			}));
			app.set('view engine', 'handlebars');

			if (process.env.NODE_ENV !== 'production') {
				app.use(allowCrossDomain);				
			}
			app.use(app.router);

			app.use(function(req, res, next) {
				// treat as 404
				res.send(404);
			});

		});

	};
});
