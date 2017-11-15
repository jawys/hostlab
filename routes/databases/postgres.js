const express = require('express');
const router = express.Router();

/* GET help page. */
router.get('/', (req, res, next) => {
    res.render('databases/postgres', {user: req.user});
});

module.exports = router;