var mongojs = require('mongojs'),
	db = mongojs(process.env.MONGO_URI, ['packages']),
	request = require('request');

var crawl = function() {
	request({
		url: 'http://registry.npmjs.com/-/_view/dependedUpon?group_level=1',
		json: true
	}, function(error, response, body) {
		if (error || response.statusCode != 200) {
			setTimeout(crawl, 2000);
			return;
		}
		body.rows.forEach(function(item) {
			var package = item.key[0];
			var dependents = item.value;
			db.packages.update({_id: package}, {$set: {dependents: dependents}});
		});
	});
};


crawl();
setInterval(crawl, 86400000);
