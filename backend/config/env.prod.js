define({
	confName: 'prod',
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
			domain: '',
			maxAge: 1000*60*60*24
		}
	},
	mongo: {
		url: ''
	},
	server: {
		port: 8081,
		ip: '127.0.0.1'
	}
});
