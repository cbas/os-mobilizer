define(['jquery', 'underscore'],
function ($, _) {
	_.mixin({

		capitalizeEach: function(string) {
			if (!string) {
				return null
			} else {
				return string
					.toLowerCase()
					.replace(/(?:^|\s)\S/g, function(a) {
						return a.toUpperCase();
					});
			}
		},

		unDasherize: function(string) {
			return string.replace(/-/g, ' ');
		},

		classify: function(string) {
			string =
				this.capitalizeEach(
					this.unDasherize(string)
				).replace(/ /g,'');
			return string;
		},

		getHashParams: function () {
			var hashParams = {},
			e, a = /\+/g,  // Regex for replacing addition symbol with a space
			r = /([^&;=]+)=?([^&;]*)/g,
			d = function (s) { return decodeURIComponent(s.replace(a, ' ')); },
			q = window.location.hash.substring(1);

			/*jshint immed: false*/
			e = r.exec(q);
			while (e) {
				hashParams[d(e[1])] = d(e[2]);
				e = r.exec(q);
			}
			return hashParams;
		},

		getParameterByName: function (name) {
			var regexS = '[\\?&]' + name + '=([^&#]*)',
			regex = new RegExp(regexS),
			results = regex.exec(window.location.search);
			if (results === null) {
				return '';
			} else {
				return decodeURIComponent(results[1].replace(/\+/g, ' '));
			}
		},

		generateHashParams: function (hashObj, options) {
			var params = '';
			options = options || {};


			if (!options.override) {
				hashObj = _.extend(_.getHashParams(), hashObj);
			}
			if (options.omit) {
				hashObj = _.omit(hashObj, options.omit);
			}

			_.each(hashObj, function(value, key) {
				params += encodeURIComponent(key) + '=' + encodeURIComponent(value) + '&';
			});
			params = params.substring(0, params.length-1);
			if (params !== '') {
				params = '#' + params;
			}
			return params;
		},

		daysSince: function (date) {
			var newDate, timeDiff, daysDiff
				today = new Date(),
				_MS_PER_DAY = 1000 * 60 * 60 *24;

			if (!date) {
				return -1;
			}
			if (typeof date === 'string') {
				newDate = new Date(parseInt(date));
			} else {
				return -1
			}

			timeDiff = Math.abs(today.getTime() - newDate.getTime());
			daysDiff = Math.floor(timeDiff / _MS_PER_DAY);

			return daysDiff;
		}

	});
});
