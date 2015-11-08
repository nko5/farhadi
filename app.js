var express = require('express'),
	app = express(),
	mongo = require('mongojs'),
	db = mongo.db(process.env.MONGO_URI, {native_parser:true});
	
require('./crawler');


//Create a static file server
app.use(express.static(__dirname + '/public'));


var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
