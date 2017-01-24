/* @flow */
import {each, map, compact, isArray, isEmpty} from 'lodash';
import chalk from 'chalk';
import rollbar from 'rollbar';

// Default Pres
import {onlyOnDevelop, requireJWTAuth, requiresRole} from './pre';

import {Server} from 'hapi';
import path from 'path';
import glob from 'glob';

import {gql} from '../gql';

import {TError} from '../lib/terror';
import {cache} from '../lib/cache';

import {log} from '../lib/logger';
import {GenericServer} from '../lib/generic-server';

const versionRegex = new RegExp(/v[0-9]+$/);
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
  subscriptions?: Array<string>,
  swagger?: {
    authStrategy: string,
    sortEndpoints?: string,
    sortTags?: string,
    expanded?: string,
    pathPrefixSize?: number,
  },
  views?: {
    engines: {
      html: Function,
    },
    isCached?: boolean,
    relativeTo?: string,
    path?: string,
    layout?: string,
    layoutPath?: string,
    helpersPath?: string,
    partialsPath?: string,
  }
};


// These are loaded outside of the instances of the webserver so they can be referenced
// By routes without needing an instantiated version of server
let pres: any = {
  onlyOnDevelop,
  requireJWTAuth,
};


export class HTTPServer extends GenericServer {
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
    pres.requiresRole = requiresRole;
  }

  static getPre(name: string) {
    if (! pres.hasOwnProperty(name)) {
      throw new Error(`Unable to find HTTPServer Pre: ${name}`);
    }
    return pres[name];
  }

  constructor(options: OptionsType = {}) {
    super(options);
    this.options = options;
    this.hapi = new Server({
      cache: cache.getCachingEngine(),
    });

    this.setConnection();
    this.registerDefaultPlugins(); // Default Hapi plugins, need to boot these before setting Auth Strategies
    this.setViewEngine();
    this.setAuthStrategies(); // Auth strategies using JWT
    this.enableGraphQLPlugin(); // Enable GraphQL if GQL Schema exists in instantiation config
    this.registerPlugins(); // Hapi plugins specified in instantiation config
    this.enableSwaggerPlugin(); // Enable Swagger, moved to after registerPlugins() in case more complicated auth strategies are enabled via registerPlugins()
    this.registerRoutes(); // Hapi routes
    this.registerSubscriptions(); // Websocket subscriptions if REDIS_URL exists
  }

  setViewEngine() {
    if (this.options.views) {
      this.hapi.views(this.options.views);
    }
  }

  enableSwaggerPlugin() {
    if (this.options.swagger) {
      this.hapi.register({
        'register': require('hapi-swagger'),
        'options': {
          schemes: [process.env.NODE_ENV !== 'development' ? 'https' : 'http'],
          auth: this.options.swagger.authStrategy || 'jwt',
          info: {
            title: process.env.APP_NAME,
          },
          sortEndpoints: this.options.swagger.sortPoints || 'path',
          sortTags: this.options.swagger.sortTags || 'name',
          expanded: this.options.swagger.expanded || 'none',
          pathPrefixSize: this.options.swagger.pathPrefixSize || 2,
        },
      });
    }
  }

  enableGraphQLPlugin() {
    if (! (this.options.graphql && this.options.graphql.schema)) {
      return null;
    }

    const schema: {} = this.options.graphql.schema;
    return this.hapi.register([{
      register: require('@jwdotjs/hapi-graphql'),
      options: {
        query: (request: any) => ({
          schema,
          graphiql: gql.helpers.hasRole(request.auth.credentials, 'admin'),
          context: {
            user: request.auth.credentials,
          },
          formatError: (error: {message: string, locations: Array<string>, stack: string}, context: {query: string, operationName: any, variables: any}) => {
            rollbar.handleErrorWithPayloadData(error, {custom: context, level: 'error'});
            log(
              chalk.red.bold('==> ', error),
              chalk.blue.bold(context.query || 'No query defined'),
              chalk.blue.bold(context.variables ? JSON.stringify(context.variables) : 'No variables')
            );

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
    }], function(err) {
      if (err) {
        throw err;
      }
    });
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
      require('nes'),
    ];

    // Plugins before auth implemented
    this.hapi.register(compact(hapiPlugins), function(err) {
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

  registerSubscriptions() {
    if (this.options.subscriptions && this.options.subscriptions.length) {
      if (!process.env.REDIS_URL) {
        throw new TError('REDIS_URL is required for subscriptions', {});
      }
      each(this.options.subscriptions, subscription => this.hapi.subscription(subscription));
    }
  }

  /**
   * [start - start hapi]
   */
  start() {
    this.hapi.start(() => {
      log(chalk.bold.blue(`Web Server: ${this.hapi.info.uri}`), chalk.bold.green('[enabled]'));
    });
  }
}
