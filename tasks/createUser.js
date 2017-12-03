const log = require('debug')('hostlab:task:createUser');
const User = require('../databases/mongodb/models/user');
// request Modul ermöglicht das posten an den gitlab Server
const request = require('request');

module.exports = (opts, callback) => {
  // Erstelle neuen Nutzer aus Schema
  let newUser = new User();
  newUser.username = opts.username;
  newUser.email = opts.email;
  newUser.isAdmin = opts.isAdmin;
  newUser.isLdapUser = opts.isLdapUser;

  newUser.hashPassword(opts.password, function(err, hash) {
    if (err) {
      return callback(err);
    }
    newUser.password = hash;
  });

  // gitlab optionen die zur Nutzergenerierung benötigt werden
  let gitlabopts = {
    email: opts.email,
    username: opts.username,
    name: opts.username,
    password: opts.password,
    admin: '' + opts.isAdmin,
    skip_confirmation: 'true'// E-Mail Zertifizierung überspringen
  };
  console.log(gitlabopts);
  // gitlab post request zur Erstellunge des Gitlab Nutzer
  // Token wird aus der Env Varialbe "GITLAB_TOKEN" geladen
  request.post({
    url: 'http://gitlab.local/api/v4/users?private_token=' +
    process.env.GITLAB_TOKEN, formData: gitlabopts,
  }, function(err, httpResponse, body) {
    if (err) {
      return console.error('Git User creation failed', err);
    }
    console.log('Git User Created:', JSON.parse(body));

    // Gitlab User ID in die Datenbank schreiben
    newUser.gitlab_id = JSON.parse(body).id;

    newUser.save(function(err) {
      if (err) {
        log(err);
        return callback(err);
      }

      /**
       * Wenn kein Linux-System, dann Systemnutzerverwaltung überspringen
       */
      const linuxUser = process.platform === 'linux'
          ? require('linux-user')
          : {
            addUser: () => {
              log('Kein Linux-System, überspringe Systemnutzerverwaltung');
              return callback(null, newUser);
            },
          };

      /**
       * Erstelle Systemuser mit Homeverzeichnis
       */
      linuxUser.addUser(opts.username, (err, user) => {
        if (err) {
          return callback(err);
        }

        /**
         * Setze Userpasswort
         */
        linuxUser.setPassword(opts.username, opts.password, (err) => {
          if (err) {
            return callback(err);
          }
          return callback(null, newUser);
        });
      });
    });
  });
};
