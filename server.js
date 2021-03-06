var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    cors = require('cors'),
    url = require('url'),
    sys = require(process.binding('natives').util ? 'util' : 'sys'),
    bodyParser     = require('body-parser'),
    errorHandler   = require('errorhandler'),
    methodOverride = require('method-override'),
    path = require('path'),
    db = require('./models'),
    passport = require('passport'),
    flash = require('connect-flash'),
    LocalStrategy = require('passport-local').Strategy,
    user = require('./routes/user');

app.set('port', process.env.PORT || 3000)
app.use(cors());
app.use(bodyParser())
app.use(express.static(path.join(__dirname, 'app')))

app.configure(function() {
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'home' }));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

function findById(id, fn) {
  db.User.find({ where: { id: id } }).success(function(entity) {
    if (entity) {
      fn(null, entity);
    } else {
      fn(new Error(id));
    }
  });
}

function findByUsername(username, fn) {
  db.User.find({ where: { email: username } }).success(function(entity) {
    if (entity) {
      return fn(null, entity);
    } else {
      return fn(null, null);
    }
  });
}

function naoAutenticado(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.send({ error: 1 });
}

function naoAutenticadoHome(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    process.nextTick(function () {
      findByUsername(username, function(err, user) {
        if (err) {
          return done(err);
        }
        if (user == null) {
          return done(null, null);
        }
        return done(null, user);
      })
    });
  }
));

app.get('/', function(req, res, next){
  res.sendfile('public/index.html', { user: req.user, message: req.flash('error') });
});

app.get('/home', naoAutenticadoHome, function(req, res, next){
  res.sendfile('app/home.html', { user: req.user });
});

app.get('/error', function(req, res, next){
  res.json({ success: 0 });
});

app.get('/logout', function(req, res, next){
  req.logout();
  res.redirect('/');
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/error', failureFlash: true }),
  function(req, res, next) {
    res.json({ success: 1 });
});

app.get('/views/home/:page', naoAutenticado, function(req, res, next){
  res.sendfile('app/views/home/index.html', { user: req.user });
});

app.get('/views/arduino/:page', naoAutenticado, function(req, res, next){
  res.sendfile('app/views/arduino/index.html', { user: req.user });
});

app.get('/views/arduino/new/:page', naoAutenticado, function(req, res, next){
  res.sendfile('app/views/arduino/new/index.html', { user: req.user });
});

app.get('/views/task/:page', naoAutenticado, function(req, res, next){
  res.sendfile('app/views/task/index.html', { user: req.user });
});

app.get('/views/task/new/:page', naoAutenticado, function(req, res, next){
  res.sendfile('app/views/task/new/index.html', { user: req.user });
});

app.get('/init', user.create)

if ('development' === app.get('env')) {
  app.use(errorHandler())
}

db.sequelize.sync({ force: false }).complete(function(err) {
  if (err) {
    throw err
  } else {
    http.listen(app.get('port'), function(){
      console.log('NodeJS está na porta: ' + app.get('port') + '.');
    });
  }
})