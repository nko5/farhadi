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

var topKeywords = [];
db.packages.aggregate([{$unwind:"$keywords"},{$group:{_id:"$keywords",count:{$sum:1}}},{$sort:{count:-1}},{$limit:50}]).forEach(function(error, doc) {
	if (!doc) {
		return;
	}
	topKeywords.push({
		keyword: doc._id,
		count: doc.count
	});
});


//app.set('view engine', 'jade');
//Create a static file server
app.use(express.static(__dirname + '/public'));
app.get('/', suspend(function*(req, res) {
	res.render('index', {
		topKeywords: topKeywords
	});
}));

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
