define(['handlebars'], function (Handlebars) {

	return function (number, options) {
		options = options || {};
		var i = 0,
		character = options.hash.character || '*',
		splitter = options.hash.splitter || ' ';

		if (!number) {
			return new Handlebars.SafeString('');
		}

		number = number + '';
		if (number.length < 16) {
			number = number.split('').reverse().join('');
			for (i = number.length; i < 16; i+=1) {
				number += '0';
			}
			number = number.split('').reverse().join('');
		}

		var output = number.replace(/[^ ]/g, character);
		output = output.substr(0, number.length - 4) +
			number.substr(number.length - 4, 4);

		var result = '';

		for (i = 0; i < output.length; i+=1) {
			result += output[i];
			if ((i+1) % 4 === 0 && i < 15) {
				result += splitter;
			}
		}


		return new Handlebars.SafeString(result);
	};

});
