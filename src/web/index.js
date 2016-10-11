/* @flow */
import {each, map, compact, isArray, isEmpty} from 'lodash';
import chalk from 'chalk';

// Default Pres
import {onlyOnDevelop} from './pre/only-on-develop';
import {requireJWTAuth} from './pre/require-jwt-auth';

import {Server} from 'hapi';
import path from 'path';
import glob from 'glob';

import {gql} from '../gql';

import {TError} from '../lib/terror';

const versionRegex = new RegExp(/v[0-9]+$/);
const REQUIRED_ENV = [
  'NODE_PATH', 'NODE_ENV', 'DATABASE_URL', 'APP_NAME', 'AMQP_URL',
  'SENDGRID_API_KEY', 'SENDGRID_DEV_EMAIL',
];
const DEFAULT_ROUTE_CONFIG = {
  cors: {
    origin: ['*'],
    exposedHeaders: ['Access-Control-Allow-Origin'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Accept-language'],
  },
  payload: {
    // Max payload of 5MB
    maxBytes: 5242880,
  },
};

type PreType = {
  method: string, assign?: string
};
type RouteType = {
  path: string,
  method: Array<string>|string,
  handler: Function,
  pre: Array<PreType>,
  config?: {
    auth: boolean|string,
    validate?: {
      payload?: any,
      query?: any,
      params?: any,
    },
    description?: string,
    notes?: string,
    tags?: Array<string>,
  },
};
type OptionsType = {
  requiredEnv?: Array<string>,
  graphql?: {
    schema: {},
  },
  pres?: any,
  routes?: Array<RouteType>,
  setAuthStrategies?: Function,
};


// These are loaded outside of the instances of the webserver so they can be referenced
// By routes without needing an instantiated version of server
let pres: any = {
  onlyOnDevelop,
  requireJWTAuth,
};


export class HTTPServer {
  hapi: any;
  options: OptionsType = {};

  /**
   * [versionRoutes - utility function to prepend versions to route objects]
   */
  static versionRoutes(version, routes) {
    if (! versionRegex.test(version)) {
      return routes;
    }

    return map(routes, (route) => {
      route.path = `/${version}${route.path}`;
      return route;
    });
  }

  static loadRoutesFromPath(routesPath) {
    let routes = [];
    each(glob.sync(routesPath), folder => {
      let newRoutes;
      each(glob.sync(path.join(folder, '**/*.js')), file => {
        const splitFile = file.split('/');
        let version = splitFile.length > 1 ? splitFile[splitFile.length - 2] : '';

        // $FlowFixMe - Doesn't support requiring via variables
        newRoutes = require(file).default;
        if (isArray(newRoutes)) {
          routes = routes.concat(HTTPServer.versionRoutes(version, newRoutes));
        }
      });
    });
    return routes;
  }

  /**
   * [setPres - pre's should be an object with a key of the pre name and a value of the function]
   */
  static setPres(newPres: any) {
    if (! isEmpty(newPres)) {
      pres = newPres;
    }

    pres.onlyOnDevelop = onlyOnDevelop;
    pres.requireJWTAuth = requireJWTAuth;
  }

  static getPre(name: string) {
    if (! pres[name]) {
      throw new Error(`Unable to find HTTPServer Pre: ${name}`);
    }
    return pres[name];
  }

  constructor(options: OptionsType = {}) {
    this.options = options;
    this.assertEnv();
    this.hapi = new Server();

    this.setConnection();
    this.registerDefaultPlugins();
    this.registerPlugins();
    this.registerRoutes();
  }

  assertEnv() {
    if (! (this.options.requiredEnv && this.options.requiredEnv.length)) {
      return;
    }

    try {
      require('assert-env')(REQUIRED_ENV);
    } catch (err) {
      console.log(chalk.red.bold(err.message.substr(0, err.message.length - 1))); // eslint-disable-line
      process.exit(1);
    }
  }

  enableGraphQLPlugin() {
    if (! (this.options.graphql && this.options.graphql.schema)) {
      return null;
    }

    const schema: {} = this.options.graphql.schema;
    return {
      register: require('@jwdotjs/hapi-graphql'),
      options: {
        query: (request: any) => ({
          schema,
          graphiql: gql.helpers.hasRole(request.auth.credentials, 'admin'),
          context: {
            user: request.auth.credentials,
          },
          formatError: (error: {message: string, locations: Array<string>, stack: string}) => {
            /* eslint-disable no-console */
            console.log(chalk.red.bold('==> ', error));
            /* eslint-enable no-console */
            return process.env.NODE_ENV !== 'development' ? {message: error.message} : {
              message: error.message,
              locations: error.locations,
              stack: error.stack,
            };
          },
        }),
        route: {
          path: '/graphql',
          config: {
            auth: requireJWTAuth,
          },
        },
      },
    };
  }

  setConnection() {
    this.hapi.connection({
      host: this.options.host || process.env.HOST || '0.0.0.0',
      port: this.options.port || process.env.PORT || '8080',
      routes: this.options.routeConfig || DEFAULT_ROUTE_CONFIG,
    });
  }

  /**
   * [setAuthStrategies - expects a function that receives server as the only argument]
   */
  setAuthStrategies() {
    if (! (this.options.setAuthStrategies && typeof this.options.setAuthStrategies === 'function')) {
      return void 0;
    }
    return this.options.setAuthStrategies(this.hapi);
  }

  /**
   * [registerDefaultPlugins - loads all plugins in hapi/plugins folder]
   */
  registerDefaultPlugins() {
    each(glob.sync(path.join(__dirname, 'plugins', '*.js')), plugin => {
      // $FlowFixMe - Doesn't support requiring via variables
      require(plugin).default(this.hapi);
    });

    let hapiPlugins = [
      require('inert'),
      require('vision'),
      require('hapi-auth-jwt2'),
    ];

    // Add swagger if not on prod
    if (process.env.NODE_ENV === 'development') {
      hapiPlugins.push({
        'register': require('hapi-swagger'),
        'options': {
          info: {
            title: process.env.APP_NAME,
          },
          sortEndpoints: 'path',
          sortTags: 'name',
          expanded: 'none',
          pathPrefixSize: 2,
        },
      });
    }

    this.hapi.register(compact(hapiPlugins), function(err) {
      if (err) {
        throw err;
      }
    });

    // setAuthStrategies requires the JWT2 plugin to be registered
    this.setAuthStrategies();

    // This plugin requires the Auth Strategy to be set already
    this.hapi.register([this.enableGraphQLPlugin()], function(err) {
      if (err) {
        throw err;
      }
    });
  }

  /**
   * [registerPlugins - Each plugin should be a function that accepts server as the only argument]
   */
  registerPlugins() {
    if (! this.options.plugins) {
      return;
    }

    each(this.options.plugins, plugin => {
      if (typeof plugin !== 'function') {
        throw new TError('Unable to load HTTPServer plugin', plugin);
      }

      plugin(this.hapi);
    });
  }

  /**
   * [registerRoutes - processes an array of route objects]
   * @return {[type]} [description]
   */
  registerRoutes() {
    if (this.options.routes && this.options.routes.length) {
      each(this.options.routes, route => this.registerRoute(route));
    }
  }

  registerRoute(route: {}) {
    this.hapi.route(route);
  }

  /**
   * [start - start hapi]
   */
  start() {
    this.hapi.start(() => {
      console.log(chalk.bold.blue(`Server: ${this.hapi.info.uri}`)); // eslint-disable-line
    });
  }
}
