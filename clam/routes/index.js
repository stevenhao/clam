var express = require('express');
var router = express.Router();

var counter = 0;

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Clam' });
});

module.exports = router;
