var express = require('express');
var router = express.Router();

var counter = 0;

router.get('/', function(req, res, next) {
  res.sendFile(__dirname + '/tester.html');
});

module.exports = router;