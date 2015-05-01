define([], function () {

	return function (str, subStr, toReplace) {
		return str ? str.replace(new RegExp(subStr), toReplace) : '';
	};

});