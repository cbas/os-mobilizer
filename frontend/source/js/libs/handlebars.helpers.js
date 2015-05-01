define([
	'handlebars',

	'helpers/currency',
	'helpers/lessthan',
	'helpers/greaterthan',
	'helpers/ifCond',
	'helpers/ccprivacy',
	'helpers/increment',
	'helpers/encodeURIComponent',
	'helpers/firstElement',
	'helpers/ifEquals',
	'helpers/replaceStr',
	'helpers/validStr'
], function (
	Handlebars,

	currency,
	lessthan,
	greaterthan,
	ifCond,
	ccprivacy,
	increment,
	encodeURIComponent_helper,
	firstElement,
	ifEquals,
	replaceStr,
	validStr
) {

	Handlebars.registerHelper('$', currency);
	Handlebars.registerHelper('increment', increment);
	Handlebars.registerHelper('ifCond', ifCond);
	Handlebars.registerHelper('ifLessthan', lessthan);
	Handlebars.registerHelper('ccprivacy', ccprivacy);
	Handlebars.registerHelper('ifGreaterthan', greaterthan);
	Handlebars.registerHelper('encodeURIComponent', encodeURIComponent_helper);
	Handlebars.registerHelper('firstElement', firstElement);
	Handlebars.registerHelper('ifEquals', ifEquals);
	Handlebars.registerHelper('replaceStr', replaceStr);
	Handlebars.registerHelper('validStr', validStr);
	Handlebars.registerHelper('json', function(context) {
		return JSON.stringify(context);
	});
	Handlebars.registerHelper('ternary', function(test, yes, no) {
        return test ? yes : no;
    });
    Handlebars.registerHelper('formatReleaseName', function(release) {
        return release ? release.alpha ? release.name + ' [Alpha]' : release.name + ' [Beta]' : null;
    });
    Handlebars.registerHelper('capitalize', function(string) {
    	return string.charAt(0).toUpperCase() + string.slice(1);
    })

	return Handlebars;
});
