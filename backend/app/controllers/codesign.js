define([
	'underscore',
	'config/config.js',
	'shelljs/global',
	's3',
	'mkdirp',
	'download',
	'rm-rf',
	'app/app'
], function (_, conf, shell, s3, mkdirp, download, rmrf, app) {

	var Actions = {}, db = {};
	var client = s3.createClient({
		s3Options: {
			accessKeyId: conf.s3.key,
			secretAccessKey: conf.s3.secret,
			region: conf.s3.region
		}
	});

	app.on('db.ready', function () {
		db = app.db;
	});

	Actions.codesign = function(req, res) {
		mkdirp('downloads', function(err) {
			if (err) {
				rmrf("downloads");
				res.send(500, {msg: err.message});
			} else {
				if (db) {
					var projCollection = db.collection('projects');
					projCollection.findOne({ repo: req.params.uri },
						function (err, project) {
							if (err) {
								res.send(500, {msg: err.message});
							} else {
								var provisioningProfile = req.params.env === 'alpha' ? project.alpha_provisioning_profile : project.beta_provisioning_profile;
								var params = {
									localFile: 'downloads/' + provisioningProfile + '.mobileprovision',
									s3Params: {
										Bucket: project.s3_bucket,
										Key: project.s3_provisioning_profile_path + '/' + provisioningProfile + '.mobileprovision'
									}
								}

								var downloader = client.downloadFile(params);
								downloader.on('error', function(err) {
									res.send(500, {msg: err.message });
								});
								downloader.on('end', function() {
									var downloadUrl;
									var uploadUrl;
									var signingAppName;
									var buildName;
									var uploadDir;
									if (req.params.env === 'alpha') {
										signingAppName = project.alpha_product_name;
										buildName = project.alpha_product_name + '.app';
										uploadDir = 'sandbox-' + req.params.build;
									} else {
										signingAppName = project.beta_product_name;
										buildName = project.beta_product_name + '.app';
										uploadDir = 'release-' + req.params.build;
									}
									uploadUrl = 'https://s3-' + conf.s3.region + '.amazonaws.com/' + project.s3_bucket + '/' + project.s3_ota_build_path + '/' + uploadDir; 
									
									var dl = new download().get(req.query.url.href).dest('downloads');
									var filename = req.query.url.href.substring(req.query.url.href.lastIndexOf('/')+1);

									dl.run(function(err, files, stream) {
										if (err) {
											rmrf("downloads");
											res.send(500, {msg: err.code === 403 ? 'Build does not exist.' : err.error });
									    	return;
										}

										exec("unzip -o 'downloads/" + filename + "' -d downloads/");
										exec("security unlock-keychain -p mobilizer mobilizer.keychain");
										exec("CODESIGN_ALLOCATE='/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/usr/bin/codesign_allocate' /usr/bin/xcrun -sdk iphoneos PackageApplication -v '" + process.cwd() + "/downloads/" + buildName + "' -o '" + process.cwd() + "/downloads/" + signingAppName + ".ipa' --sign 'iPhone Distribution' --embed 'downloads/" + provisioningProfile + ".mobileprovision'");
										var url = exec("cd downloads; ../app/helpers/ipa_ota '" + process.cwd() + "/downloads/" + signingAppName + ".ipa' " + uploadUrl + "/").output.trim();
									
										var params = {
											localFile: "downloads/" + signingAppName + ".ipa",
										 
											s3Params: {
												Bucket: project.s3_bucket,
										    	Key: project.s3_ota_build_path + "/" + uploadDir + "/" + signingAppName + ".ipa",
										    	ACL: "public-read"
										  },
										};

										var uploader = client.uploadFile(params);
										uploader.on('error', function(err) {
											exec("rm -rf downloads");
											console.log(err);
											res.send(500, {msg: err.message});
										});
										uploader.on('end', function() {
											var params = {
											localFile: "downloads/" + signingAppName + ".plist",
										 
											s3Params: {
												Bucket: project.s3_bucket,
										    	Key: project.s3_ota_build_path + "/" + uploadDir + "/" + signingAppName + ".plist",
										    	ACL: "public-read"
											  },
											};

											var uploader = client.uploadFile(params);
											uploader.on('error', function(err) {
												rmrf("downloads");
												res.send(500, {msg: err.message});
											}).on('end', function() {
												rmrf("downloads");
												res.send(200, {url: url });
											});
										});
									});
								});
							}
						});
				} else {
					res.send(500, {msg: 'Unable to connect to db.'});
				}
			}
		});
	}

	return Actions;
});