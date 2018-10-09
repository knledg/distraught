// @flow
/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const lusca = require('lusca');
const flash = require('express-flash');
const passport = require('passport');

const http = require('http');
const socketio = require('socket.io');

const Raven = require('raven');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const _ = require('lodash');
const helmet = require('helmet');
const YAML = require('yamljs');

const cfg = require('./lib/config').cfg;
const logErr = require('./lib/logger').logErr;

type Req = {|
  body: Object,
  query: Object,
  path: string,
  params: Object,
  user: null|Object,
  headers: Object,
  originalUrl: string,
  validationErrors: () => Array<Object>,
  assert: (string, string) => {
    isInt: Function,
    isEmail: Function,
    equals: Function,
    len: Function,
  },
  sanitize: (string) => Object,
  isAuthenticated: () => boolean,
  flash: ('success'|'info'|'error'|'warning', Array<string>|string) => void,
  session: Object,
  logout: Function,
|};

type Res = $ReadOnly<{
  send: (any) => Res,
  json: (any) => Res,
  status: (number) => Res,
  render: (string, ?Object) => void,
  locals: Object,
  redirect: (string) => void,
  type: (any) => Res,
  set: (string, string) => void,
}>;

type OptionsType = {
  logFormat?: string,
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
    pre?: Function,
  }, // for optional swagger integration
  findUserById: (id: number) => Object,
  viewEngine?: string,
  enableStatusMonitor?: boolean,
  enableExpressValidator?: boolean,
};

const {
  PORT,
  SENTRY_DSN,
  REDIS_URL,
  REDIS_PREFIX,
  TTL_IN_SECONDS,
  SESSION_SECRET,
  NODE_ENV,
} = process.env;

const httpServer = function httpServer(options: OptionsType) {
  const app = express();
  app.set('port', PORT || 3000);

  // $FlowBug
  const webserver = http.Server(app); // eslint-disable-line
  const io = socketio(webserver);

  app.use(helmet());

  if (SENTRY_DSN) {
    Raven.config(SENTRY_DSN, {
      autoBreadcrumbs: true,
      environment: NODE_ENV,
      captureUnhandledRejections: true,
    }).install();
    app.use(Raven.requestHandler());
  }

  if (options.enableStatusMonitor) {
    app.use(require('express-status-monitor')({
      websocket: io,
    }));
  }

  app.use(compression());
  app.set('view engine', options.viewEngine || 'pug');
  app.use(logger(options.logFormat || 'dev'));

  app.use(bodyParser.json(options.bodyParser && options.bodyParser.jsonOptions ? options.bodyParser.jsonOptions : {}));
  app.use(bodyParser.urlencoded(options.bodyParser && options.bodyParser.urlencodedOptions ? _.assign({extended: true}, options.bodyParser.urlencodedOptions) : {extended: true}));

  if (options.enableExpressValidator) {
    app.use(require('express-validator')());
  }

  if (options.viewPath) {
    app.set('views', options.viewPath);
  }

  if (options.publicPath) {
    app.use(express.static(options.publicPath, {maxAge: 31557600000}));
  }

  app.use(flash());
  app.use(lusca.xframe('SAMEORIGIN'));
  app.use(lusca.xssProtection(true));

  let sessionStore = null;
  if (REDIS_URL) {
    const redisOptions = {url: REDIS_URL, prefix: ''};
    if (REDIS_PREFIX) {
      redisOptions.prefix = REDIS_PREFIX;
    }
    const redisClient = redis.createClient(redisOptions);
    sessionStore = new RedisStore({
      ttl: TTL_IN_SECONDS || 86400, // one day
      client: redisClient,
      url: REDIS_URL,
    });

    const redisAdapter = require('socket.io-redis');
    io.adapter(redisAdapter(REDIS_URL));
  }

  const sessionOpts = _.assign({}, {
    resave: false,
    rolling: true,
    saveUninitialized: false,
    unset: 'destroy',
    secret: SESSION_SECRET,
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

  if (options.swaggerConfig && options.swaggerConfig.appRoot) {
    const swaggerUi = require('swagger-ui-express');

    // Exposes /swagger (as JSON) and activates all Swagger Routers
    require('swagger-express-middleware')(options.swaggerConfig.yamlPath, app, function(err, middleware) {
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
      const swaggerPre = _.get(options, 'swaggerConfig.pre', (req, res, next) => next());
      app.use('/docs', swaggerPre, swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    }
  }

  return {
    app,
    io,
    passport,
    start() {
      webserver.listen(app.get('port'), () => {
        console.log(`${chalk.green('✓')} App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`); //eslint-disable-line no-console
      });
    },
  };
};

/**
 * Wrap an Express handler Fn with this to capture any uncaught exceptions and return a 500 Error
 * @param {*} genFn
 */
function wrap(genFn: (Req, Res) => Promise<*>) {
  return function handler(req: Req, res: Res, next: Function) {
    return genFn(req, res)
      .catch((err) => {
        logErr(err, {params: req.params, body: req.body, query: req.query, user: req.user});

        if (NODE_ENV === 'production') {
          return cfg.pathToServerErrorTemplate ?
            res.render(cfg.pathToServerErrorTemplate) :
            res.send('Internal Server Error');
        }

        return res.status(500).send({
          error: {
            message: err.message,
            stack: err.stack.split('\n'),
          },
          req: {
            body: req.body,
            params: req.params,
            query: req.query,
            user: req.user,
          },
        });
      });
  };
}

function jsonWrap(genFn: (Req, Res) => Promise<*>) {
  return function handler(req: Req, res: Res, next: Function) {
    return genFn(req, res)
      .catch((err) => {
        logErr(err, {params: req.params, body: req.body, query: req.query, user: req.user});

        if (err.message.indexOf('Unauthorized') !== -1) {
          return res.status(401).send({message: 'Unauthorized'});
        } else if (err.message.indexOf('Forbidden') !== -1) {
          return res.status(403).send({message: 'Forbidden'});
        } else if (err.message.indexOf('timeout') !== -1) {
          return res.status(504).json({message: 'Server taking too long to respond'});
        }

        return res.status(500).send({
          message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        });
      });
  };
}

module.exports = {
  httpServer,
  w: wrap,
  jw: jsonWrap,
};
