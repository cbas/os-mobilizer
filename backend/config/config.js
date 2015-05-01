define(function () {
	return (process.env.NODE_ENV === 'production') ? requirejs('config/env.prod.js') : requirejs('config/env.local.js');
});
