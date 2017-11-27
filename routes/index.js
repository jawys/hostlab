// login
const login = require('./login');
const logout = require('./logout');

// dashboard
const dashboard = require('./dashboard');

// settings
const settings = require('./settings');

// help
const help = require('./help/index');

// filemanager
const filemanager = require('./filemanager/index');

// cronjobs
const cronjobs = require('./cronjobs/index');

// databases
const databases = require('./databases/index');
const postgres = require('./databases/postgres');
const mongodb = require('./databases/mongodb');

// runtimes
const runtimes = require('./runtimes/index');
const nodejs = require('./runtimes/nodejs');
const php = require('./runtimes/php');

// vcs
const vcs = require('./vcs/index');
const gitlab = require('./vcs/gitlab');
const svn = require('./vcs/svn');

// admin
const admin = require('./admin/index');

module.exports = (app) => {

  // login
  app.use('/login', login);

  /**
   * Ab hier können die Routen nur noch als registrierter Benutzer aufgerufen werden
   */
  app.use(isRegistered);

  app.use(exposeReqInfos);

  //settings
  app.use('/settings', settings);

  // logout
  app.use('/logout', logout);

  // dashboard
  app.use('/', dashboard);

  // help
  app.use('/help', help);

  // filemanager
  app.use('/filemanager', filemanager);

  // cronjobs
  app.use('/cronjobs', cronjobs);

  // databases
  app.use('/databases', databases);
  app.use('/databases/postgresql', postgres);
  app.use('/databases/mongodb', mongodb);

  // runtimes
  app.use('/runtimes', runtimes);
  app.use('/runtimes/nodejs', nodejs);
  app.use('/runtimes/php', php);

  // vcs
  app.use('/vcs', vcs);
  app.use('/vcs/nodejs', gitlab);
  app.use('/vcs/php', svn);

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
    return next();
  }
  res.redirect('/login');
}

/**
 * Helferfunktion um Administrator zu identifizieren
 */
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.admin) {
    return next();
  }
  res.redirect('/');
}

/**
 * Helferfunktion für Vorverarbeitungen des Requests
 */
function exposeReqInfos(req, res, next) {
  const navPath = req.path.split('/')[1] || 'dashboard';
  const activeNav = 'nav-' + navPath;
  res.locals[activeNav] = true;
  next();
}
