var express = require('express');
var http = require('http')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var tester = require('./routes/tester');
var notes = require('./routes/notes');
var cards = require('./routes/cards');

var app = express();
app.set('port', process.env.PORT || 5000)
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', routes);
app.use('/', index);
app.use('/tester', tester);
app.use('/users', users);
app.use('/notes', notes);
app.use('/cards', cards);

var server = http.createServer(app);
require('./server')(server);
// should be require('./server')(server);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;
