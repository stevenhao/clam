var express = require('express');
var http = require('http')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
app.set('port', process.env.PORT || 5000)

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function(req, res) {
  res.sendfile('views/index.html');
});

app.get('/tester', function(req, res) {
  res.sendfile('views/tester.html');
});


app.get('/notes', function(req, res) {
  res.sendfile('views/notes.html');
});


app.get('/cards', function(req, res) {
  res.sendfile('views/cards.html');
});


var server = http.createServer(app);
require('./server')(server);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;
