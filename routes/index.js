const login = require('./login');
const logout = require('./logout');
const dashboard = require('./dashboard');
const settings = require('./settings');
const help = require('./help');
const filemanager = require('./filemanager');
const cronjobs = require('./cronjobs');
const databases = require('./databases');
const postgres = require('./databases/postgres');
const mongodb = require('./databases/mongodb');
const runtimes = require('./runtimes');
const nodejs = require('./runtimes/nodejs');
const php = require('./runtimes/php');
const vcs = require('./vcs');
const gitlab = require('./vcs/gitlab');
const svn = require('./vcs/svn');
const admin = require('./admin');
const container = require('./api/container');

module.exports = (app) => {
  app.use('/login', login);

  /**
   * Ab hier können die Routen nur noch als registrierter Benutzer aufgerufen werden
   */
  app.use(isRegistered);

  app.use('/logout', logout);

  app.use('/api/container', container);

  app.use(exposeReqInfos);

  app.use('/', dashboard);

  app.use('/cronjobs', cronjobs);

  app.use('/databases', databases);
  app.use('/databases/mongodb', mongodb);
  app.use('/databases/postgresql', postgres);

  app.use('/filemanager', filemanager);

  app.use('/help', help);

  app.use('/runtimes', runtimes);
  app.use('/runtimes/nodejs', nodejs);
  app.use('/runtimes/php', php);

  app.use('/settings', settings);

  app.use('/vcs', vcs);
  app.use('/vcs/git', gitlab);
  app.use('/vcs/svn', svn);

  /**
   * Ab hier können die Routen nur noch als Administrator aufgerufen werden
   */
  app.use(isAdmin);

  app.use('/admin', admin);

};

/**
 * Helferfunktion um registrierte Nutzer zu identifizieren
 */
function isRegistered(req, res, next) {
  if (req.isAuthenticated()) {
    // Reiche das User-Objekt an die nächsten Routen weiter
    res.locals.user = req.user;

    // Weitermachen
    return next();
  }
  res.redirect('/login');
}

/**
 * Helferfunktion um Administrator zu identifizieren
 */
function isAdmin(req, res, next) {
  if (req.user.isAdmin) {
    // Zeige Adminansicht statt Nutzeransicht
    res.locals.layout = 'admin';

    // Weitermachen
    return next();
  }
  res.redirect('/');
}

/**
 * Helferfunktion für Vorverarbeitungen des Requests
 */
function exposeReqInfos(req, res, next) {
  // Damit die Rendering-Engine weiß auf welchem Navigationselement wir uns
  // befinden, stellen wir ihr eine entsprechende Variable zur Verfügung.
  const navPath = req.path.split('/')[1] || 'dashboard';
  const activeNav = 'nav-' + navPath;
  res.locals[activeNav] = true;
  next();
}
