define([
	'shelljs/global',
	'fs',
	'path',
	'underscore', 
	'scp',
	'config/config.js', 
	'mongodb',
	'app/app', 
	'moment-timezone', 
	'download', 
	'yauzl', 
	'rm-rf', 
	'ssh2shell',
	'osenv',
	'mkdirp',
	's3',
	'app/controllers/settings'
], function (shell, fs, path, _, scp, conf, mongodb, app, moment, download, yauzl, rmrf, ssh2shell, osenv, mkdirp, s3, settings) {

	var Actions = {}, settings = {}, db = {};
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

	function testError(res, err, run) {
		run.status = 'error';
		run.logData += err.message;
		delete run.pid;

		app.io.sockets.emit('done', {status: run.status, error: err.message, data: run, msg: err.message});

		var runsCollection = db.collection('runs');
		runsCollection.update({ id: run.id }, run);

    	res.send(500, {msg: err.message});
	}

	function updateConsoleLog(run, command, text) {
		if (!run.logData) {
			run.logData = {};
		}

		app.io.sockets.emit('stream', {data: text.replace(run.logData[command], ''), id: run.id});

		run.logData[command] = text;

		var runsCollection = db.collection('runs');
		runsCollection.update({ id: run.id }, run);
	}

	Actions.iOS = function(res, run) {
		// Start test run using already download .app file
    	if (run.testFilename) {
    		uploadiOSArtifacts(res, run);
    	} else {
    		// Download .app from storage source (i.e. S3)
			var dl = new download().get(run.appUrl.href).dest('uploads/' + run.id);

			run.testFilename = run.appUrl.href.substring(run.appUrl.href.lastIndexOf('/')+1);

			updateConsoleLog(run, 'download', 'Downloading ' + run.testFilename + '...\n');

			dl.run(function(err, files, stream) {
				if (err) {
					testError(res, err, run);
			    	return;
				}

				uploadiOSArtifacts(res, run);				
			});
		}
	}

	function uploadiOSArtifacts(res, run) {
		if (run.testZip) {
			var options = {
				file: 'uploads/' + run.id + '/' + run.testZip,
				host: settings.device_terminal_host,
				user: settings.device_terminal_username,
				path: '.'
			};

			scp.send(options, function(err) {
				if (err) {
					testError(res, err, run);
				} else {
					startIOSCalTest(res, run);
				}
			});
		} else {
			startIOSCalTest(res, run);
		}
	}

	function startIOSCalTest(res, run) {
		mkdirp('downloads', function(err) {
			if (err) {
				testError(res, err, run);
			} else {
				var provisioningProfile = run.testReleaseEnv === 'alpha' ? run.project.alpha_provisioning_profile : run.project.beta_provisioning_profile;
				var params = {
					localFile: 'downloads/' + provisioningProfile + '.mobileprovision',
					s3Params: {
						Bucket: run.project.s3_bucket,
						Key: run.project.s3_provisioning_profile_path + '/' + provisioningProfile + '.mobileprovision'
					}
				}

				var downloader = client.downloadFile(params);
				downloader.on('error', function(err) {
					testError(res, err, run);
				});
				downloader.on('end', function() {
					var interval, tmpRun, tmpCommand, tmpResponse;
					var runsCollection = db.collection('runs');
					var pidStored = false;
					var calFrameworkDlPrompted = false;
					var passwordPrompted = false;
					var svnGithubUsernamePrompted = false;
					var svnGithubPasswordPrompted = false;
					var githubUsernamePrompted = false;
					var githubPasswordPrompted = false;
					var storePasswordPrompted = false;
					var testCompleted = false;

					host = {
						server: {       
							host: settings.device_terminal_host,
							port: 22,
							userName: settings.device_terminal_username,
							privateKey: require('fs').readFileSync(osenv.home() + '/.ssh/id_rsa')
						},
						idleTimeOut: 200000,
						commands: ['mkdir ios-' + run.id + '; ' +
								'cd ios-' + run.id + '; ' +
								(run.testSource === 'github' ? 'svn checkout ' + run.project.calabash_feature_url + '; ' :
								'unzip -o ' + run.testZip + '; ' +
								'rm -f ' + run.testZip + '; ') +
								'export LC_ALL="en_US.UTF-8";' +
								'security -v unlock-keychain -p mobilizer mobilizer.keychain; ' +
								(run.project.test_build_source === 'repo' ? 'cp -R ' + osenv.home() + '/' + run.project.test_repo_path + '/. .; ' +
								'git stash; ' +
								'git fetch; ' +
								'git checkout tags/' + run.testTag + ';' +
								'git stash pop; ' +
								'calabash-ios download; ' +
								'pod install --no-repo-update; ' +
								'appName=' + run.project.test_ios_configuration + '-iphoneos/$(xcodebuild -workspace ' + run.project.test_ios_workspace + '.xcworkspace -scheme ' + run.project.test_ios_scheme + ' -showBuildSettings | awk -F "= " \'/FULL_PRODUCT_NAME/ {print $2}\'); ' +
								'uuid=$(`grep UUID -A1 -a ' + process.cwd() + '/downloads/' + provisioningProfile + '.mobileprovision | grep -io "[-A-Z0-9]\{36\}"`); ' +
								'xctool -workspace ' + run.project.test_ios_workspace + '.xcworkspace -scheme ' + run.project.test_ios_scheme + ' -sdk iphoneos -configuration ' + run.project.test_ios_configuration + ' OBJROOT=' + osenv.home() + '/ios-' + run.id + ' SYMROOT=' + osenv.home() + '/ios-' + run.id + ' CODE_SIGNING_IDENTITY="iPhone Developer" PROVISIONING_PROFILE=$uuid; ' +
								'buildStatus=$?; ' :
								'unzip -o ' + run.testFilename + '; ' +
								'appName=$(unzip -qql ' + run.testFilename + ' | head -n1 | tr -s " " | cut -d" " -f5-); ' +
								'appName=$(echo "$appName" | tr -d "/"); ') +
								'if [ $buildStatus == 0 ]; then CODESIGN_ALLOCATE=/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/usr/bin/codesign_allocate /usr/bin/xcrun -sdk iphoneos PackageApplication -v ' + osenv.home() + '/ios-' + run.id + '/$appName -o ' + osenv.home() + '/ios-' + run.id + '/test.ipa; ' +
								'ruby ' + process.cwd() + '/app/helpers/transporter_chief.rb ' + osenv.home() + '/ios-' + run.id + '/test.ipa; ' +
								'DEVICE_ENDPOINT=http://' + run.testDeviceIp + ':37265 DEVICE_TARGET=' + run.testDeviceId + ' RESET_BETWEEN_SCENARIOS=1 BUNDLE_ID=' + (run.testReleaseEnv === 'alpha' ? run.project.alpha_package : run.project.beta_package) + ' cucumber ' + (run.testCase.indexOf('All') !== -1 ? osenv.home() + '/ios-' + run.id + '/features' : osenv.home() + '/ios-' + run.id + '/' + run.testCase) + '; ' +
								'buildStatus=$?; fi; ' +
								'rm -rf ' + osenv.home() + '/ios-' + run.id + '; ' +
								'echo "exit: $buildStatus"; exit;'],
						connectedMessage: "Connected",
						readyMessage: "Ready",
						closedMessage: "Closed",
						onCommandProcessing: function(command, response, sshObj, stream) {
							tmpRun = run;
							tmpCommand = command;
							tmpResponse = response;

							if (!interval) {
								interval = setInterval(function() {
									updateConsoleLog(tmpRun, tmpCommand, tmpResponse);
								}, 2000);
							}

							if (!pidStored) {
								pidStored = true;
								exec("ps -x | grep [s]shd | awk 'END{print $1}'", function(code, output) {
									run.pid = output.replace('\n', '');
									runsCollection.update({ id: run.id }, run);
								});
							}

							if (response.indexOf('Please answer yes (y) or no (n)') !== -1 && !calFrameworkDlPrompted) {
								calFrameworkDlPrompted =  true;
								stream.write('y\n');
							} else if (response.indexOf('Username for \'https://github.com\':') !== -1 && !githubUsernamePrompted) {
								githubUsernamePrompted = true;
								stream.write(settings.github_user + '\n');
							} else if (response.indexOf('Password for \'https://' + settings.github_user + '@github.com\':') !== -1 && !githubPasswordPrompted) {
								githubPasswordPrompted = true;
								stream.write(settings.github_password + '\n');
							} else if (response.indexOf('(R)eject, accept (t)emporarily or accept (p)ermanently?') !== -1) {
								stream.write('p\n');
							} else if (response.indexOf('Password for \'' + settings.device_terminal_username + '\':') !== -1 && !passwordPrompted) {
				    			passwordPrompted = true;
								stream.write('\n');
							} else if (response.indexOf('Username:') !== -1 && !svnGithubUsernamePrompted) {
								svnGithubUsernamePrompted =  true;
								stream.write(settings.github_user + '\n');
							} else if (response.indexOf('Password for \'' + settings.github_user + '\':') !== -1 && !svnGithubPasswordPrompted) {
								svnGithubPasswordPrompted = true;
								stream.write(settings.github_password + '\n');
							} else if (response.indexOf('Store password unencrypted (yes/no)?') !== -1 && !storePasswordPrompted) {
								storePasswordPrompted = true;
								stream.write('yes\n');
							} else if (response.match(/exit: (\d+)/)) {
								if (!testCompleted) {
									testCompleted = true;
									run.status = response.match(/exit: (\d+)/)[1] === 0 ? 'passed' : 'failed';
									delete run.pid;

									app.io.sockets.emit('done', {status: run.status, data: run});
									runsCollection.update({ id: run.id }, run);

									res.send(200, {status: run.status, run: run});
								}
							}
						},
						onCommandTimeout: function(command, response, stream, connection) {
							rmrf(osenv.home() + '/ios-' + run.id);
							err = {message: 'Command timed out.'};
							testError(res, err, run);
						}, 
						onError: function(err, type, close, callback) {
							rmrf(osenv.home() + '/ios-' + run.id);
							testError(res, err, run);
						}
					};

					ssh = new ssh2shell(host);
					ssh.connect();
					ssh.on("close", function onClose(had_error) { 
						clearInterval(interval);
					});
				});
			}
		});
	}

	Actions.Android = function(res, run) {
		// Start test run using uploaded apk file
    	if (run.testFilename) {
    		uploadAndroidArtifacts(res, run);
    	} else {
    		// Download apk from storage source (i.e. S3)
			var dl = new download().get(run.appUrl.href).dest('uploads/' + run.id);

			run.testFilename = run.appUrl.href.substring(run.appUrl.href.lastIndexOf('/')+1);

			updateConsoleLog(run, 'download', 'Downloading ' + run.testFilename + '...\n');

			dl.run(function(err, files, stream) {
				if (err) {
					testError(res, err, run);
			    	return;
				}

				uploadAndroidArtifacts(res, run);
			});
		}
	}

	function uploadAndroidArtifacts(res, run) {
		updateConsoleLog(run, 'uploadFile', 'Uploading ' + run.testFilename + ' to device terminal...\n');

		var options = {
			file: 'uploads/' + run.id + '/' + run.testFilename,
			host: settings.device_terminal_host,
			user: settings.device_terminal_username,
			path: '.'
		};

		scp.send(options, function(err) {
			if (err) {
				testError(res, err, run);
			} else {
				if (run.testZip) {
					updateConsoleLog(run, 'uploadTest', 'Uploading ' + run.testZip + ' to device terminal...\n');

					options.file = 'uploads/' + run.id + '/' + run.testZip;

					scp.send(options, function(err) {
						if (err) {
							testError(res, err, run);
						} else {
							startAndroidCalTest(res, run);
						}
					});
				} else {
					startAndroidCalTest(res, run);
				}
			}
		});
	}

	function startAndroidCalTest(res, run) {
		var interval, tmpRun, tmpCommand, tmpResponse;
		var runsCollection = db.collection('runs');
		var pidStored = false;
		var passwordPrompted = false;
		var githubUsernamePrompted = false;
		var githubPasswordPrompted = false;
		var storePasswordPrompted = false;
		var testCompleted = false;

		host = {
			server: {       
				host: settings.device_terminal_host,
				port: 22,
				userName: settings.device_terminal_username,
				privateKey: require('fs').readFileSync(osenv.home() + '/.ssh/id_rsa')
			},
			idleTimeOut: 200000,
			commands: ['mkdir android-' + run.id + '; ' +
					'mv ' + run.testFilename + ' android-' + run.id + '/.; ' +
					'cd android-' + run.id + '; ' +
					(run.testSource === 'github' ? 'svn checkout ' + run.project.calabash_feature_url + '; ' :
					'unzip -o ' + run.testZip + '; rm -f ' + run.testZip + '; ') + 
					'calabash-android resign ' + run.testFilename + '; ' +
					(run.testDeviceId ? 'ADB_DEVICE_ARG=' + run.testDeviceId + ' TEST_SERVER_PORT=3499 ' : '') + 'RESET_BETWEEN_SCENARIOS=1 calabash-android run ' + run.testFilename + (run.testCase.indexOf('All') !== -1 ? '' : ' ' + run.testCase) + '; ' +
					'status=$?; ' +
					'rm -rf ' + osenv.home() + '/android-' + run.id + '; ' +
					'echo "exit: $status"; exit;'],
			connectedMessage: "Connected",
			readyMessage: "Ready",
			closedMessage: "Closed",
			onCommandProcessing: function(command, response, sshObj, stream) {
				tmpRun = run;
				tmpCommand = command;
				tmpResponse = response;

				if (!interval) {
					interval = setInterval(function() {
						updateConsoleLog(tmpRun, tmpCommand, tmpResponse);
					}, 2000);
				}

				if (!pidStored) {
					pidStored = true;
					exec("ps -x | grep [s]shd | awk 'END{print $1}'", function(code, output) {
						run.pid = output.replace('\n', '');
						runsCollection.update({ id: run.id }, run);
					});
				}

				if (response.indexOf('(R)eject, accept (t)emporarily or accept (p)ermanently?') !== -1) {
					stream.write('p\n');
				} else if (response.indexOf('Password for \'' + settings.device_terminal_username + '\':') !== -1 && !passwordPrompted) {
	    			passwordPrompted = true;
					stream.write('\n');
				} else if (response.indexOf('Username:') !== -1 && !githubUsernamePrompted) {
					githubUsernamePrompted =  true;
					stream.write(settings.github_user + '\n');
				} else if (response.indexOf('Password for \'' + settings.github_user + '\':') !== -1 && !githubPasswordPrompted) {
					githubPasswordPrompted = true;
					stream.write(settings.github_password + '\n');
				} else if (response.indexOf('Store password unencrypted (yes/no)?') !== -1 && !storePasswordPrompted) {
					storePasswordPrompted = true;
					stream.write('yes\n');
				} else if (response.match(/exit: (\d+)/)) {
					if (!testCompleted) {
						testCompleted = true;
						run.status = response.match(/exit: (\d+)/)[1] === 0 ? 'passed' : 'failed';
						delete run.pid;

						app.io.sockets.emit('done', {status: run.status, data: run});
						runsCollection.update({ id: run.id }, run);

						res.send(run.status === 'passed' ? 200 : 400, {status: run.status, run: run});
					}
				}
			},
			onCommandTimeout: function(command, response, stream, connection) {
				rmrf(osenv.home() + '/android-' + run.id);
				err = {message: 'Command timed out.'};
				testError(res, err, run);
			},
			onError: function(err, type, close, callback) {
				rmrf(osenv.home() + '/android-' + run.id);
				testError(res, err, run);
			}
		};

		ssh = new ssh2shell(host);
		ssh.connect();
		ssh.on("close", function onClose(had_error) { 
			clearInterval(interval);
		});
	}

	Actions.list = function(req, res) {
		if (req.params.uri) {
			if (db) {
				var runsCollection = db.collection('runs');
				runsCollection.find({ repo: req.params.uri }).sort({ id: 0 }).toArray(function (err, runs) {
					if (err) {
	    				res.send(500, {msg: err.message});
					} else {
						res.json(runs);
					}
				});
			} else {
				res.send(500, {msg: 'Unable to connect to db.'});
			}
		} else {
			res.send(400, {msg: 'Unable to find runs for that repo.'});
		}
	}

	Actions.create = function(req, res) {
		Actions.fetchSettings(function(success) {
			if (success) {
				var projCollection = db.collection('projects');
				projCollection.findOne({ repo: req.params.uri },
					function (err, project) {
						if (err) {
							res.send(500, {msg: err.message});
						} else {
							var deviceCollection = db.collection('devices');							
							deviceCollection.findOne({ _id: new mongodb.ObjectID(req.query.testDeviceId) },
								function (err, device) {
									if (err) {
										res.send(500, {msg: err.message});
									} else {
										var runsCollection = db.collection('runs');							
										if (req.params.id) {
											runsCollection.findOne(
												{ id: parseInt(req.params.id) },
												function (err, run) {
													if (err) {
														res.send(500, {msg: err.message});
													} else {
														run.name = req.query.appName;
														run.platform = req.params.platform;
														run.repo = req.params.uri;
														run.project = project;
														run.status = "running";
														run.appUrl = req.query.appUrl;
														run.testCase = req.query.testCase;
														run.testType = req.query.testType;
														run.testTag = req.query.testTag;
														run.testSource = req.query.testSource;
														run.testReleaseEnv = req.query.testReleaseEnv;
														run.testDeviceId = device.id;
														run.testDeviceIp = device.ip;
														run.timestamp = moment(new Date().toISOString()).tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('LLL');

														runsCollection.update(run, {safe: true}, function (err, insertedModels) {
															if (err) {
																res.send(500, {msg: err.message});
															} else {
																if (req.query.manual) {
																	res.send(200, {run: run});
																}
																return req.params.platform === 'android' ? Actions.Android(res, run) : Actions.iOS(res, run);
															}
														});
													}
												});
										} else {
											var runData = {};
											runData.id = Date.now();
											runData.name = req.query.appName;
											runData.platform = req.params.platform;
											runData.repo = req.params.uri;
											runData.project = project;
											runData.status = "running";
											runData.appUrl = req.query.appUrl;
											runData.testCase = req.query.testCase;
											runData.testType = req.query.testType;
											runData.testTag = req.query.testTag;
											runData.testSource = req.query.testSource;
											runData.testReleaseEnv = req.query.testReleaseEnv;
											runData.testDeviceId = device.id;
											runData.testDeviceIp = device.ip;
											runData.timestamp = moment(new Date().toISOString()).tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('LLL');

											runsCollection.insert(runData, {safe: true}, function (err, insertedModels) {
												if (err) {
													res.send(500, {msg: err.message});
												} else {
													if (req.query.manual) {
														res.send(200, {run: runData});
													}
													return req.params.platform === 'android' ? Actions.Android(res, runData) : Actions.iOS(res, runData);
												}
											});
										}
									}
								});
						}
					});
			} else {
				res.send(500, {msg: 'Unable to retrieve server settings.'});
			}
		});
	}

	Actions.update = function(req, res) {
		Actions.fetchSettings(function(success) {
			if (success) {
				var projCollection = db.collection('projects');
				projCollection.findOne({ repo: req.params.uri },
					function (err, project) {
						if (err) {
							res.send(500, {msg: err.message});
						} else {
							var runsCollection = db.collection('runs');
							runsCollection.findOne(
								{ id: parseInt(req.params.id) },
								function (err, run) {
									if (err) {
										res.send(500, {msg: err.message});
									} else {
										run.status = 'running';
										run.project = project;
										run.logData = '';
										run.timestamp = moment(new Date().toISOString()).tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('LLL');

										runsCollection.update(
											{ id: parseInt(req.params.id) },
											run,
											function (err, updatedModels) {
												if (err) {
													res.send(500, {msg: err.message});
												} else {
													if (req.query.manual) {
														res.json(200);
													}
													return req.params.platform === 'android' ? Actions.Android(res, run) : Actions.iOS(res, run);
												}
											});
									}
							});
						}
					});
			} else {
				res.send(500, {msg: 'Unable to retrieve server settings.'});
			}
		});
	}

	Actions.init = function(req, res) {
		var cases = [];

		function toTitleCase(str) {
		    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		}

		if (db) {
			var runsCollection = db.collection('runs');
			var run = {};
			run.id = req.files['files[]'].path.split('/')[1];
			if (req.query.type === 'apk') {
				run.testFilename = req.files['files[]'].originalname;
			} else {
				run.testZip = req.files['files[]'].originalname;			
			}

			runsCollection.update({ id: run.id }, run, {upsert: true}, function (err, insertedModels) {
				if (err) {
					res.send(500, {msg: err.message});
				} else {
					if (req.query.type === 'zip') {
						yauzl.open('uploads/' + run.id + '/' + req.files['files[]'].originalname, function(err, zipfile) {
							if (err) {
								res.send(500, {msg: err.message});
								return;
							}

							zipfile.on('entry', function(entry) {
								if (/\/$/.test(entry.fileName)) {
									return;
								}

								zipfile.openReadStream(entry, function(err, readStream) {
									if (err) {
										console.log('ERROR: ' + err.message);
									}

									if (entry.fileName.indexOf('__MACOSX') === -1) {
										if (entry.fileName.indexOf('.feature') !== -1) {
											cases.push({
												display_name: toTitleCase(entry.fileName.replace('features/', '').replace('.feature', '')),
												name: entry.fileName,
												local_path: 'features/' + entry.fileName
											});
										}
									}	
								});
							}).on('end', function(entry) {
								var response = {
									files: [
										{
											name: req.files['files[]'].originalname,
											size: req.files['files[]'].size,
											url: 'uploads/' + run.id + '/' + req.files['files[]'].originalname
										}
									],
									testCases: cases
								};

								res.send(200, response);
							});
						});
					} else {
						var response = {
							files: [
								{
									name: req.files['files[]'].originalname,
									size: req.files['files[]'].size,
									url: 'uploads/' + run.id + '/' + req.files['files[]'].originalname
								}
							]
						};

						res.send(200, response);
					}
				}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	Actions.cancel = function(req, res) {
		if (db) {
			var runsCollection = db.collection('runs');
			runsCollection.findOne(
				{ id: parseInt(req.params.id) },
				function (err, run) {
					if (err) {
						res.send(500, {msg: err.message});
					} else {
						exec("kill -9 " + run.pid, function(code, output) {
							setTimeout(function() {
								rmrf(osenv.home() + '/' + run.platform + '-' + run.id);
								run.status = 'cancelled';
								delete run.pid;

								runsCollection.update(
									{ id: run.id },
									run,
									function (err, updatedModels) {
										if (err) {
											res.send(500, {msg: err.message});
										} else {
											res.json(200);
										}
									});
							}, 500);
						});
					}
			});
		} else {
			res.send(500, {msg: 'Unable to connect to db.'});
		}
	}

	Actions.fetchSettings = function(callback) {
		if (db) {
			var settingsCollection = db.collection('settings');
			settingsCollection.find().toArray(function (err, setting) {
				if (setting.length > 0) {
					settings = setting[0];
					callback(true);
				} else {
					callback(false);
				}
			});
		} else {
			callback(false);
		}
	}

	return Actions;
});