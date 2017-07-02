// @flow
/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const SwaggerExpress = require('swagger-express-mw');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const flash = require('express-flash');
const path = require('path');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const Raven = require('raven');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const swaggerTools = require('swagger-tools');
const YAML = require('yamljs');

const redisClient = redis.createClient({url: process.env.REDIS_URL});

type OptionsType = {
  publicPath?: string,
  viewsPath?: string,
  swaggerConfig?: {
    appRoot: string,
    yamlPath?: string,
  }, // for optional swagger integration
  findUserById: (id: number) => Object,
  viewEngine?: string,
};

const httpServer = function httpServer(options: OptionsType) {
  const app = express();

  app.set('port', process.env.PORT || 3000);

  if (process.env.RAVEN_TOKEN) {
    Raven.config(process.env.RAVEN_TOKEN).install();
    app.use(Raven.requestHandler());
  }

  app.use(expressStatusMonitor());
  app.use(compression());
  app.set('view engine', options.viewEngine || 'pug');
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(expressValidator());

  if (options.viewPath) {
    app.set('views', options.viewPath);
  }

  if (options.publicPath) {
    app.use(sass({
      src: options.publicPath,
      dest: options.publicPath
    }));
    app.use(express.static(options.publicPath, { maxAge: 31557600000 }));
  }

  app.use(flash());
  app.use(lusca.xframe('SAMEORIGIN'));
  app.use(lusca.xssProtection(true));

  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new RedisStore({
      client: redisClient,
      url: process.env.REDIS_URL,
    }),
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    return options.findUserById(id)
      .then((user) => done(null, user))
      .catch((err) => done(err, false));
  });

  app.use(passport.initialize());
  app.use(passport.session());


  app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
  });
  app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./) &&
        req.session) {
      req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == '/account' &&
        req.session) {
      req.session.returnTo = req.path;
    }
    next();
  });

  /**
   * OAuth authentication routes. (Sign in)
   */
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });

  /**
   * Error Handler.
   */
  if (process.env.RAVEN_TOKEN) {
    app.use(Raven.errorHandler());
  } else {
    app.use(errorHandler());
  }

  if (options.swaggerConfig && options.swaggerConfig.appRoot) {
    // Exposes /swagger (as JSON) and activates all Swagger Routers
    SwaggerExpress.create(options.swaggerConfig, function(err, swaggerExpress) {
      if (err) { throw err; }
      swaggerExpress.register(app);
    });

    // Serve Swagger Docs At /docs
    if (options.swaggerConfig.yamlPath) {
      const swaggerDoc = YAML.load(options.swaggerConfig.yamlPath);
      swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
        app.use(middleware.swaggerUi());
      });
    }
  }

  return {
    app,
    passport,
    start() {
      this.app.listen(app.get('port'), () => {
        console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); 
      });
    },
  };
}

module.exports = {
  httpServer,
};
