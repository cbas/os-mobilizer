define(['handlebars'], function (Handlebars) {

	return function (number, options) {
		number += 1;
		if (!number) {
			return new Handlebars.SafeString('');
		}
		return new Handlebars.SafeString(number);
	};

});
