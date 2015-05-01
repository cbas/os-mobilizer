module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-connect-proxy');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-handlebars');
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-contrib-imagemin');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-filerev');
	grunt.loadNpmTasks('grunt-usemin');
	grunt.loadNpmTasks('grunt-replace');
	grunt.loadNpmTasks('grunt-open');

	grunt.initConfig({

		base: grunt.config('base') || grunt.option('base') || process.cwd(),

		source: 'source',

		staging: 'intermediate',

		production: 'publish',

		clean: {
			staging: ['<%= staging %>/'],
			production: ['<%= production %>/']
		},

		copy: {
			staging: {
				files: [{
					expand: true,
					cwd: '<%= source %>/',
					dest: '<%= staging %>/',
					src: [
						'index.html',
						'humans.txt',
						'robots.txt',
						'version.txt',
						'fonts/**',
						'js/**',
						'styles/**',
						'img/**',
						'templates/**'
					]
				}]
			},
			production: {
				files: [{
					expand: true,
					cwd: '<%= staging %>/',
					dest: '<%= production %>/',
					src: [
						'index.html',
						'humans.txt',
						'robots.txt',
						'version.txt',
						'fonts/**',
						'js/{fallback,loader}.*.js',
						'styles/*.css',
						'img/**/*.{jpg,jpeg,gif,png,ico,webp}'
					]
				}]
			}
		},

		stylus: {
			dev: {
				options: {
					compress: true
				},
				files: {
					'<%= source %>/styles/app.css': '<%= source %>/styles/app.styl'
				}
			},
			staging: {
				options: {
					compress: true
				},
				files: {
					'<%= staging %>/styles/app.css': '<%= staging %>/styles/app.styl'
				}
			}
		},

		cssmin: {
			options: {
				report: 'min'
			},
			compress: {
				files: {
					'<%= staging %>/styles/app.css': '<%= staging %>/styles/app.css',
					'<%= staging %>/styles/font-awesome.css': '<%= staging %>/styles/font-awesome.css'
				}
			}
		},

		handlebars: {
			compile: {
				options: {
					processName: function (filename) {
						var prefix = 'templates/',
							cutoff = filename.indexOf(prefix);
						if (cutoff === -1) {
							throw new Error('Invalid template path');
						}
						return filename
							// Strip "templates/" prefix
							.substring(cutoff + prefix.length)
							// Trim ".html" extension
							.split('.').slice(0, -1).join('.');
					},
					namespace: 'JST',
					amd: true
				},
				files: {
					'<%= staging %>/js/templates.built.js':
						'<%= staging %>/templates/**/*.html'
				}
			}
		},

		htmlmin: {
			options: {
				removeComments: true,
				removeCommentsFromCDATA: true,
				removeCDATASectionsFromCDATA: true,
				collapseWhitespace: false,
				collapseBooleanAttributes: true,
				removeAttributeQuotes: true,
				removeRedundantAttributes: true,
				useShortDoctype: true,
				removeEmptyAttributes: true,
				removeOptionalTags: true,
				removeEmptyElements: false
			},
			html: {
				files: [{
					expand: true,
					src: [
						'<%= staging %>/index.html'
					]
				}]
			},
			templates: {
				files: [{
					expand: true,
					src: [
						'<%= staging %>/templates/**/*.html'
					]
				}]
			}
		},

		imagemin: {
			images: {
				options: {
					optimizationLevel: 7,
					progressive: true
				},
				files: [{
					expand: true,
					src: ['<%= staging %>/img/**/*.{jpg,jpeg,png}'],
					dest: ''
				}]
			}
		},

		filerev: {
			js: {
				files: [{
					src: [
						'<%= staging %>/js/{fallback,loader}.js'
					]
				}]
			},
			css: {
				files: [{
					src: [
						'<%= staging %>/styles/app.css',
						'<%= staging %>/styles/font-awesome.css'
					]
				}]
			},
			assets: {
				files: [{
					src: [
						'<%= staging %>/img/**/*.{jpg,jpeg,gif,png,webp}',
						'<%= staging %>/fonts/**/*.{eot,svg,otf,ttf,woff}'
					]
				}]
			}
		},

		usemin: {
			options: {
				assetsDirs: ['<%= staging %>']
			},
			templates: {
				options: {
					type: 'html',
					basedir: '.'
				},
				files: [{
					src: ['<%= staging %>/templates/**/*.html']
				}]
			},
			css: {
				options: {
					assetsDirs: ['<%= staging %>', '<%= staging %>/styles']
				},
				files: [{
					src: ['<%= staging %>/styles/app.css', '<%= staging %>/styles/font-awesome.css']
				}]
			},
			html: ['<%= staging %>/index.html']
		},

		requirejs: {
			compile: {
				options: {
					baseUrl: '<%= staging %>/js',
					mainConfigFile: '<%= staging %>/js/loader.js',
					out: '<%= staging %>/js/loader.js',
					name: 'loader',
					optimize: 'uglify',
					preserveLicenseComments: false
				}
			},
			fallback: {
				options: {
					baseUrl: '<%= staging %>/js',
					mainConfigFile: '<%= staging %>/js/fallback.js',
					out: '<%= staging %>/js/fallback.js',
					name: 'fallback',
					optimize: 'uglify',
					preserveLicenseComments: false
				}
			}
		},

		connect: {
			development: {
				options: {
					base: '<%= source %>',
					port: 9000
				}
			},
			staging: {
				options: {
					base: '<%= staging %>',
					port: 9001
				}
			},
			production: {
				options: {
					base: '<%= production %>',
					port: 9002
				}
			},
			options: {
				middleware: function (connect, options) {
					return [
						connect.static(options.base),
						function (req, res) {
							var path = options.base + '/index.html';
							var file = grunt.file.read(path);
							res.end(file);
						}
					];
				}
			}
		},

		open: {
			development: {
				path: 'http://localhost:<%= connect.development.options.port %>/'
			},
			production: {
				path: 'http://localhost:<%= connect.production.options.port %>/'
			}
		},

		watch: {
			styl: {
				files: [
					'<%= source %>/styles/**/**/**.styl'
				],
				tasks: 'stylus:dev',
				options: {
					debounceDelay: 1000,
					interrupt: true
				}
			}
		},

		replace: {
			dist: {
				options: {
					variables: {
						'rev': '<%= grunt.config.get("meta.rev") %>',
						'date': '<%= grunt.config.get("meta.date") %>',
						'tag': '<%= grunt.config.get("meta.tag") %>'
					},
					prefix: '@@'
				},
				files: [{
					expand: true,
					flatten: true,
					src: [
						'<%= staging %>/index.html',
						'<%= staging %>/version.txt'
					],
					dest: '<%= staging %>/'
				}]
			}
		}

	});

	grunt.registerTask('versionise',
		'Adds version meta intormation to index.html', function () {
		var done = this.async(),
			arr = [];

		grunt.util.spawn({
			cmd : 'git',
			args : ['log', '-1', '--pretty=format:%h\n %ci']
		}, function (err, result) {
			if (err) {
				return done(false);
			}
			arr = result.toString().split('\n ');
			grunt.config('meta.rev', arr[0]);
			grunt.config('meta.date', arr[1]);
		});

		grunt.util.spawn({
			cmd : 'git',
			args : [
				'for-each-ref',
				'--sort=*authordate',
				'--format="%(tag)"',
				'refs/tags'
			]
		}, function (err, result) {
			if (err) {
				return done(false);
			}
			arr = result.toString().split('\n');

			var tag = arr[arr.length - 1];
			tag = tag.toString();
			grunt.config('meta.tag', tag);

			done(result);
		});



	});

	grunt.registerTask('stage', [
		'clean:staging',
		'copy:staging',
		'imagemin',
		'filerev:assets',
		'usemin:templates',
		'stylus:staging',
		'cssmin',
		'usemin:css',
		'filerev:css',
		'handlebars',
		'requirejs',
		'filerev:js',
		'versionise',
		'replace:dist',
		'usemin:html'
	]);

	grunt.registerTask('publish', [
		'clean:production',
		'copy:production'
	]);

	grunt.registerTask('dev', [
		'stylus:dev',
		'connect:development',
		'open:development',
		'watch'
	]);

};