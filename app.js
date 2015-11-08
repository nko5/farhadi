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

var trends = suspend.promise(function*() {
	return {
		trendings: {
			day: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.day": -1})
				.limit(50, suspend.resume()),
			week: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.week": -1})
				.limit(50, suspend.resume()),
			month: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"trends.month": -1})
				.limit(50, suspend.resume())
		},
		downloads: {
			day: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.day": -1})
				.limit(50, suspend.resume()),
			week: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.week": -1})
				.limit(50, suspend.resume()),
			month: yield db.packages.find({}, {_id: 1, description: 1, downloads: 1})
				.sort({"downloads.month": -1})
				.limit(50, suspend.resume())
		},
		depended: yield db.packages.find({}, {_id: 1, description: 1, dependents: 1})
			.sort({"dependents": -1})
			.limit(50, suspend.resume()),
		keywords: yield db.packages.aggregate([
			{$unwind: "$keywords"},
			{$group: {_id: "$keywords",count: {$sum: 1}}},
			{$sort: {count: -1}},
			{$limit: 50}
		], suspend.resume()),
	};
})();

//app.set('view engine', 'jade');
//Create a static file server
app.use(express.static(__dirname + '/public'));
app.get('/', suspend(function*(req, res) {
/*
	db.packages.find({}, {_id:1, description:1}).sort({"downloads.day":-1}).limit(30, suspend.resume());
	db.packages.find({}, {_id:1, description:1}).sort({"downloads.week":-1}).limit(30, suspend.resume());
	db.packages.find({}, {_id:1, description:1}).sort({"downloads.month":-1}).limit(30, suspend.resume());
	var topDownloads = {
		day: yield 'day',
		week: yield 'week',
		month: yield 'month'
	};*/
	res.render('index', yield trends);
}));

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
