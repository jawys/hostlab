var express = require('express');
var router = express.Router();

/* GET help page. */
router.get('/', function(req, res, next) {
    res.render('databases/postgres');
});

module.exports = router;