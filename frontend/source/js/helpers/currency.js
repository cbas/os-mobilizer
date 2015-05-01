define(['underscore', 'handlebars'], function (_, Handlebars) {

	return function (amount, options) {
		if (isNaN(amount)) {
			return new Handlebars.SafeString('');
		}

		var hash = _.extend({
			decimal: '.',
			precision: 2,
			symbol: '$',
			thousand: ',',
			abs: false
		}, options.hash);

		var str = amount.toString().split('e'),
			significand = +(str[0] + 'e' + (str[1] ?
			(+str[1] + hash.precision) : hash.precision)),
			digits = (amount === 0) ?
				(new Array(1 + hash.precision)).join('0') :
				parseInt(significand, 10).toString(),
			until = digits.length - hash.precision,
			before = digits.substr(0, until) || '0',
			split = before.replace(/\B(?=(\d{3})+(?!\d))/g, hash.thousand),
			after = digits.substr(-1 * hash.precision);

		if(amount !== 0) {
			for(var i = 1; i < hash.precision; i += 1) {
				if(Math.abs(amount) < Math.pow(10, -i)) {
					after = '0' + after;
				}
			}
		}

		var output = hash.precision > 0 ?
				hash.symbol + split + hash.decimal + after :
				hash.symbol + split;


		if (!hash.abs && output.indexOf('-') !== -1) {
			output = '-' + output.replace('-', '');
		} else {
			output = output.replace('-', '');
		}

		return new Handlebars.SafeString(output);
	};

});
