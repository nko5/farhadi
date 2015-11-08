var express = require('express'),
	app = express(),
	mongojs = require('mongojs'),
	db = mongojs(process.env.MONGO_URI, ['packages'], {authMechanism: 'ScramSHA1'});
	
require('./crawler');


//Create a static file server
app.use(express.static(__dirname + '/public'));


var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
