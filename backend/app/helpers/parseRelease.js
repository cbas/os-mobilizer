define(['moment-timezone'], function (moment) {

	function sortByLatestReleaseDate(a, b) {
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	}

	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\$&");
	}

	return function(res, project, platform) {
		var releases = {};

		res.sort(sortByLatestReleaseDate);

		res.forEach(function(release, index) {
			release.release_date = moment(release.published_at).tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('LLL');
			release.version_number = release.name.match(new RegExp(escapeRegExp(project.version_regex))) !== null ?
									 release.name.match(new RegExp(escapeRegExp(project.version_regex)))[project.version_regex_group] : null;
			release.version_suffix = release.name.match(new RegExp(escapeRegExp(project.version_suffix_regex))) !== null ?
									 release.name.match(new RegExp(escapeRegExp(project.version_suffix_regex)))[project.version_suffix_regex_group] : null;
			release.body = release.body.replace(/<br>/g, '\n');

			release.build_number = release.name.match(new RegExp(escapeRegExp(project.build_regex))) !== null ?
			release.name.match(new RegExp(escapeRegExp(project.build_regex)))[project.build_regex_group] : null;
			release.version_name = release.version_suffix ? release.version_number + '.' + release.version_suffix : release.version_number;
			release.alpha = (release.name.match(new RegExp(escapeRegExp(project.alpha_regex))) || release.body.match(new RegExp(escapeRegExp(project.alpha_regex)))) ? true : false;
			release.beta = (release.name.match(new RegExp(escapeRegExp(project.beta_regex))) || release.body.match(new RegExp(escapeRegExp(project.beta_regex)))) ? true : false;
			release.alpha_package_name = project.alpha_package;
			release.beta_package_name = project.beta_package;

			if (release.alpha) {
				var url = release.body.match(new RegExp(escapeRegExp(project.alpha_url_regex)));
				if (url != null) {
					release.alpha_download_link = url[project.alpha_url_regex_group];
				}
			}
			if (release.beta) {
				var url = release.body.match(new RegExp(escapeRegExp(project.beta_url_regex)));
				if (url != null) {
					release.beta_download_link = url[project.beta_url_regex_group];
				}
			}

			var releaseBranch = release.target_commitish;
			if (!releases[releaseBranch]) {
				releases[releaseBranch] = [];
			}

			// Create duplicate release for easy display and download if it's a multi release
			if (release.alpha && release.beta) {
				copy = JSON.parse(JSON.stringify(release));
				release.alpha = false;
				release.alpha_download_link = null;
				releases[releaseBranch].push(release);
				copy.beta = false;
				copy.beta_download_link = null;
				releases[releaseBranch].push(copy);
			} else {
				releases[releaseBranch].push(release);
			}
		});

		return releases;
	};
});