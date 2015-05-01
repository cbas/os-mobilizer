define([
	'underscore',
	'fs',
	'multer',
	'app/controllers/projects',
	'app/controllers/devices',
	'app/controllers/login',
	'app/controllers/user',
	'app/controllers/test',
	'app/controllers/releases',
	'app/controllers/features',
	'app/controllers/branches',
	'app/controllers/codesign',
	'app/controllers/settings'
], function (
	_, fs, multer, Projects, Devices, Login, User, Test, Releases, Features, Branches, Codesign, Settings
) {
	return function (app, conf) {
		app

		.get('/', function(req, res) {
			res.send(200);
		})

		.get('/projects/:platform/:uri', Projects.list)
		.get('/projects/:platform', Projects.list)
		.get('/projects', Projects.list)
		.get('/test/android/new', Test.Android)
		.get('/test/:uri', Test.list)
		.get('/devices/:platform', Devices.list)
		.get('/devices', Devices.list)

		.get('/releases/:platform/:repo', Releases.releases)
		.get('/features', Features.listFeatures)
		.get('/:platform/:repo/branches', Branches.branches)

		.get('/codesign/:uri/:env/:build', Codesign.codesign)

		.get('/settings', Settings.get)

		.post('/projects', Projects.create)
		.post('/devices', Devices.create)

		.post('/login', Login.login)
		.post('/logout', Login.logout)

		.post('/test/cancel/:id', Test.cancel)
		.post('/test/new', multer({
			dest: 'uploads',
			rename: function (fieldname, filename, req, res) {
				return filename;
			},
			changeDest: function(dest, req, res) {
				dest += '/' + req.query.id;

				var stat = null;
				try {
					stat = fs.statSync(dest);
				} catch(err) {
					fs.mkdirSync(dest);
				}

				if (stat && !stat.isDirectory()) {
					throw new Error('Directory cannot be created because a node of a different type exists at ' + dest);
				}

				return dest;
			}
		}), Test.init)
		.post('/test/:platform/:uri', Test.create)

		.post('/user/roles', User.getRoles)

		.post('/settings', Settings.update)

		.put('/projects', Projects.update)
		.put('/devices', Devices.update)
		.put('/test/:platform/:uri/:id', Test.update)
		.put('/features', Features.updateFeatures)

		.delete('/projects', Projects.delete)
		.delete('/devices', Devices.delete)
		.delete('/features', Features.deleteFeatures);
	};
});
