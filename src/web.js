// @flow
/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const swaggerExpress = require('swagger-express-middleware');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const lusca = require('lusca');
const flash = require('express-flash');
const passport = require('passport');
const expressValidator = require('express-validator');

const http = require('http');
const socketio = require('socket.io');

const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const Raven = require('raven');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const _ = require('lodash');

const YAML = require('yamljs');

type OptionsType = {
  publicPath?: string,
  viewsPath?: string,
  session?: {
    resave?: boolean,
    rolling?: boolean,
    saveUninitialized?: boolean,
  },
  bodyParser?: {
    jsonOptions?: Object,
    urlencodedOptions?: Object,
  },
  swaggerConfig?: {
    appRoot: string,
    yamlPath?: string,
    swaggerDocOptions?: Object,
  }, // for optional swagger integration
  findUserById: (id: number) => Object,
  viewEngine?: string,
};

const httpServer = function httpServer(options: OptionsType) {
  const app = express();
  app.set('port', process.env.PORT || 3000);

  // $FlowBug
  const webserver = http.Server(app); // eslint-disable-line
  const io = socketio(webserver);

  if (process.env.SENTRY_DSN) {
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true,
      environment: process.env.NODE_ENV,
      captureUnhandledRejections: true,
    }).install();
    app.use(Raven.requestHandler());
  }

  app.use(expressStatusMonitor({
    websocket: io,
  }));
  app.use(compression());
  app.set('view engine', options.viewEngine || 'pug');
  app.use(logger('dev'));

  app.use(bodyParser.json(options.bodyParser && options.bodyParser.jsonOptions ? options.bodyParser.jsonOptions : {}));
  app.use(bodyParser.urlencoded(options.bodyParser && options.bodyParser.urlencodedOptions ? _.assign({extended: true}, options.bodyParser.urlencodedOptions) : {extended: true}));
  app.use(expressValidator());

  if (options.viewPath) {
    app.set('views', options.viewPath);
  }

  if (options.publicPath) {
    app.use(sass({
      src: options.publicPath,
      dest: options.publicPath,
    }));
    app.use(express.static(options.publicPath, {maxAge: 31557600000}));
  }

  app.use(flash());
  app.use(lusca.xframe('SAMEORIGIN'));
  app.use(lusca.xssProtection(true));

  let sessionStore = null;
  if (process.env.REDIS_URL) {
    const redisOptions = {url: process.env.REDIS_URL, prefix: ''};
    if (process.env.REDIS_PREFIX) {
      redisOptions.prefix = process.env.REDIS_PREFIX;
    }
    const redisClient = redis.createClient(redisOptions);
    sessionStore = new RedisStore({
      ttl: process.env.TTL_IN_SECONDS || 86400, // one day
      client: redisClient,
      url: process.env.REDIS_URL,
    });
  }

  const sessionOpts = _.assign({}, {
    resave: true,
    rolling: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
  }, options.session);

  app.use(session(sessionOpts));

  passport.serializeUser((user, done) => {
    if (! (user && user.id)) {
      throw new Error('User not found');
    }
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    return options.findUserById(id)
      .then((user) => {
        if (_.isEmpty(user)) {
          throw new Error('User not found');
        }
        return done(null, user);
      })
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
        req.path === '/account' &&
        req.session) {
      req.session.returnTo = req.path;
    }
    next();
  });

  if (options.swaggerConfig && options.swaggerConfig.appRoot) {
    // Exposes /swagger (as JSON) and activates all Swagger Routers
    swaggerExpress(options.swaggerConfig.yamlPath, app, function(err, middleware) {
      if (err) { throw err; }
      app.use(
        middleware.metadata(),
        middleware.CORS(), //eslint-disable-line new-cap
        // middleware.files(),
        middleware.parseRequest(),
        middleware.validateRequest(),
        // middleware.mock()
      );

      app.use((error, req, res, next) => {
        if (req.accepts('json')) {
          res.status(error.status);
          res.type('json');
          res.send({message: error.message});
        } else {
          next();
        }
      });
    });

    // Serve Swagger Docs At /docs
    if (options.swaggerConfig && options.swaggerConfig.yamlPath) {
      const yamlConfig = YAML.load(options.swaggerConfig.yamlPath);
      const swaggerDoc = _.assign({}, yamlConfig, _.get(options, 'swaggerConfig.swaggerDocOptions', {}));
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    }
  }

  return {
    app,
    io,
    passport,
    start() {
      webserver.listen(app.get('port'), () => {
        //eslint-disable
        console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); //eslint-disable-line no-console
      });
    },
  };
};

module.exports = {
  httpServer,
};
