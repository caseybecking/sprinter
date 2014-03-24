module.exports = function (env) {
  var express = require('express');
  var app = express();
  var db = require('./db')(env.get('db'));
  var bz = require('bz');

  app.use(express.logger('dev'));
  app.use(express.compress());
  app.use(express.json());
  app.use(express.urlencoded());

  // Static files
  app.use(express.static('./app'));

  // Serve up virtual configuration "file"
  app.get('/config.js', function (req, res) {
    var config = env.get('ANGULAR');

    res.setHeader('Content-type', 'text/javascript');
    res.send('window.angularConfig = ' + JSON.stringify(config));
  });

  require('./routes')(env, app, db);

  // bz
  var bugzilla = bz.createClient();
  app.get('/bug', function (req, res, next) {
    bugzilla.searchBugs(req.query, function(err, bugs) {
      if (err) {
        return next(err);
      }
      var output = bugs.map(function(bug) {

        // Check real name
        if (!bug.assigned_to_detail.real_name) {
          bug.assigned_to_detail.real_name = bug.assigned_to_detail.email.split('@')[0];
        }
        // Check if bugs which it depends on are resolved
        if (bug.depends_on.length) {
          bug.depends_on.forEach(function(blockerId) {
            bugs.forEach(function(item) {
              if (item.id === blockerId && !item.resolution) {
                bug.blocked = true;
              }
            })
          });
        }
        return bug;
      });
      res.send(output);
    })
  });

  return app;
};
