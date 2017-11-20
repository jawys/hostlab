const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/', (req, res, next) => {
    res.render('login', {layout: 'empty'});
});

/**
 * Route fürs Login, Passport als Middleware handelt den Login und leitet sofern er erfolgreich war
 * an die nächste Funktion weiter. Anderenfalls wird wieder auf /login verwiesen
 */
router.post('/', passport.authenticate('local-login',
    {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/');
    }
);

module.exports = router;