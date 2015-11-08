var express = require('express'),
	cons = require('consolidate'),
	suspend = require('suspend'),
	app = express(),
	mongojs = require('mongojs'),
	db = mongojs(process.env.MONGO_URL, ['packages'], {
		authMechanism: 'ScramSHA1'
	});

require('./crawler');

app.engine('html', cons.underscore);
app.set('view engine', 'html');

var getTrends = suspend.promise(function*(keyword) {
	var conditions = keyword ? {keywords: keyword} : {};
	var trends = {
		trendings: {
			day: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.day": -1})
				.limit(50, suspend.resume()),
			week: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.week": -1})
				.limit(50, suspend.resume()),
			month: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.month": -1})
				.limit(50, suspend.resume())
		},
		downloads: {
			day: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.day": -1})
				.limit(50, suspend.resume()),
			week: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.week": -1})
				.limit(50, suspend.resume()),
			month: yield db.packages.find(conditions, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.month": -1})
				.limit(50, suspend.resume())
		},
		depended: yield db.packages.find(conditions, {_id: 1, description: 1, dependents: 1})
			.sort({"dependents": -1})
			.limit(50, suspend.resume())
	};
	if (!keyword) {
		trends.keywords = yield db.packages.aggregate([
			{$unwind: "$keywords"},
			{$group: {_id: "$keywords",count: {$sum: 1}}},
			{$sort: {count: -1}},
			{$limit: 50}
		], suspend.resume());
	}
	return trends;
});

var globalTrends = getTrends();
setInterval(function() {
	globalTrends = getTrends();
}, 86400000);

//app.set('view engine', 'jade');
//Create a static file server
app.use(express.static(__dirname + '/public'));
app.get('/', suspend(function*(req, res) {
	var data = yield globalTrends;
	res.locals.keyword = req.query.keyword || '';
	if (!req.query.keyword) {
		return res.render('index', data);
	}
	res.locals.keywords = data.keywords;
	res.render('index', yield getTrends(req.query.keyword));
}));

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
