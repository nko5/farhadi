var mongojs = require('mongojs'),
	suspend = require('suspend'),
	db = mongojs(process.env.MONGO_URI, ['packages'], {authMechanism: 'ScramSHA1'}),
	request = require('request');

var crawl = function() {
	request({
		url: 'http://registry.npmjs.com/-/_view/dependedUpon?group_level=1',
		json: true
	}, function(error, response, body) {
		if (error || response.statusCode != 200) {
			return;
		}
		body.rows.forEach(function(item) {
			var package = item.key[0];
			var dependents = item.value;
			db.packages.update({_id: package}, {$set: {dependents: dependents}});
		});
	});

	var formatDate = function(date) {
		return date.getUTCFullYear() + '-' +
			('0' + (date.getUTCMonth() + 1)).substr(-2) + '-' +
			('0' + date.getUTCDate()).substr(-2);
	};
	
	var lastDay = formatDate(new Date(Date.now() - 86400000));
	var lastWeek = formatDate(new Date(Date.now() - 86400000 * 7));

	db.packages.find({}, {_id:1, downloads:1}, suspend(function*(error, docs) {
		if (error) {
			return;
		}
		for (var i = 0; i < docs.length; i++) {
			request({
				url: 'https://api.npmjs.org/downloads/range/last-month/' + docs[i]._id,
				json: true
			}, function(fork, error, response, body) {
				if (error || response.statusCode != 200) {
					body = null;
				}
				fork(null, {doc: this, data: body});
			}.bind(docs[i], suspend.fork()));

			if (i % 100 != 0) {
				continue;
			}
			var results = yield suspend.join();

			results.forEach(function(result) {
				if (!result.data) {
					return;
				}
				if (!result.data.downloads) {
					if (result.doc.downloads) {
						db.packages.update({_id: result.doc._id}, {$unset: {downloads: ''}});
					}
					return;
				}
				var downloads = {
					day: 0,
					week: 0,
					month: 0
				};
				result.data.downloads.forEach(function(item) {
					downloads.month += item.downloads;
					if (item.day == lastDay) {
						downloads.day = item.downloads;
					} 
					if (item.day >= lastWeek) {
						downloads.week += item.downloads;
					}
				});
				db.packages.update({_id: result.doc._id}, {$set: {downloads: downloads}});
			});
		}
	}));
};


crawl();
setInterval(crawl, 86400000);
