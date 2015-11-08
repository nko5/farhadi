var mongojs = require('mongojs'),
	suspend = require('suspend'),
	db = mongojs(process.env.MONGO_URL, ['packages'], {authMechanism: 'ScramSHA1'}),
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
	var last2Day = formatDate(new Date(Date.now() - 86400000 * 2));
	var lastWeek = formatDate(new Date(Date.now() - 86400000 * 7));
	var last2Week = formatDate(new Date(Date.now() - 86400000 * 14));
	var lastMonth = formatDate(new Date(Date.now() - 86400000 * 30));
	var last2Month = formatDate(new Date(Date.now() - 86400000 * 60));

	db.packages.find({}, {_id:1, downloads:1}, suspend(function*(error, docs) {
		if (error) {
			return;
		}
		for (var i = 0; i < docs.length; i++) {
			request({
				url: 'https://api.npmjs.org/downloads/range/' + last2Month + ':' + lastDay+ '/' + docs[i]._id,
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
						db.packages.update({_id: result.doc._id}, {$unset: {downloads: '', trends: ''}});
					}
					return;
				}
				var downloads = {
					day: 0,
					week: 0,
					month: 0
				};
				var tmpDownloads = {
					day: 10,
					week: 10,
					month: 10
				};
				result.data.downloads.forEach(function(item) {
					if (item.day == lastDay) {
						downloads.day = item.downloads;
					} 
					if (item.day >= lastWeek) {
						downloads.week += item.downloads;
					}
					if (item.day >= lastMonth) {
						downloads.month += item.downloads;
					}
					if (item.day == last2Day) {
						tmpDownloads.day += item.downloads;
					} 
					if (item.day >= last2Week && item.day < lastWeek) {
						tmpDownloads.week += item.downloads;
					}
					if (item.day >= last2Month && item.day < lastMonth) {
						tmpDownloads.month += item.downloads;
					}
				});
				var trends = {
					day: downloads.day / tmpDownloads.day,
					week: downloads.week / tmpDownloads.week,
					month: downloads.month / tmpDownloads.month,
				};
				db.packages.update({_id: result.doc._id}, {$set: {downloads: downloads, trends: trends}});
			});
		}
	}));
};


setInterval(crawl, 86400000);
