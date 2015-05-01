define({
	confName: 'local',
	github: {
		name: '',
		token: ''
	},
	googleapp: {
		id: '',
		secret: ''
	},
	s3: {
		key: '',
		secret: '',
		region: ''
	},
	session: {
		cookie: {
			domain: '.localhost',
			maxAge: 1000*60*60*24
		}
	},
	mongo: {
		url: ''
	},
	server: {
		port: 9081,
		ip: '127.0.0.1'
	}
});
