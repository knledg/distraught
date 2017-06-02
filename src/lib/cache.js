// @flow
import _ from 'lodash';
import {Client} from 'catbox';

import {TError} from './terror';
import {MINUTE} from './constants';
import Promise from 'bluebird';

class Cache {

  client: Client;
  delayBetweenAttempts: number = 300; // number of MS to delay is the caching server can't server requests yet
  maxAttempts: number = 5; // number of attempts before throwing error

  constructor() {
    const config = this.getCachingEngine();
    this.client = new Client(config.engine, config);
    this.start();
  }

  isReady(attempts: number = 0): Promise<true|Error> {
    const isReady = this.client.isReady();

    if (isReady) {
      return Promise.resolve(isReady);
    } else if (attempts > this.maxAttempts) {
      return Promise.reject(new TError('Unable to reach caching server, max attempts reached'));
    }

    return Promise.delay(this.delayBetweenAttempts).then(() => this.isReady(attempts++));
  }

  /**
   * Enables caching layer, returns a Promise
   */
  start(): Promise<Error|void> {
    return new Promise((resolve, reject) => {
      this.client.start((err) => {
        return err ? reject(err) : resolve();
      });
    });
  }

  /**
   * Given a string key, invalidates that cache
   */
  invalidate(key: string): Promise<Error|true> {
    return this.isReady()
      .then(() => {
        return new Promise((resolve, reject) => {
          return this.client.drop({segment: key, id: ''}, (err) => {
            return err ? reject(err) : resolve(true);
          });
        });
      });
  }

  /**
   * Disables caching layer
   */
  stop() {
    return this.client.stop();
  }

  /**
   * Fetches a key from the cache
   * @param {String} Key where the cached value is stored
   * @return {Promise} Promise of value or null if expired
   */
  get(key: string): Promise<?any|Error> {
    return new Promise((resolve, reject) => {
      return this.isReady()
        .then(() => {
          return this.client.get({segment: key, id: ''}, (err, cached) => {
            return err ? reject(err) : resolve(cached && cached.item);
          });
        });
    });
  }

  /**
   * Set a key/value pair with a TTL until the cache expires.
   * Default TTL: 5 minutes
   */
  set(key: string, value: any, ttl: number = MINUTE * 5): Promise<?any|Error> {
    return this.isReady()
        .then(() => {
          return new Promise((resolve, reject) => {
            return this.getValueIfFunc(value)
              .then((result) => {
                return this.client.set({segment: key, id: ''}, result, ttl, (err) => {
                  return err ? reject(err) : resolve(result);
                });
              })
              .catch((err) => {
                reject(err);
              });
          });
        })
        .catch((error) => {
          throw new TError(`Unable to set cache for key ${key}, promise rejected`, {
            message: error.message,
            key,
            ttl,
          });
        });
  }

  getOrSet(key: string, value: any, ttl?: number): Promise<?any|Error> {
    return this.get(key)
      .then(getResult => {
        return getResult ? getResult : this.set(key, value, ttl);
      })
      .catch((error) => {
        if (error instanceof TError) {
          throw error;
        }
        throw new TError(`Unable to getOrSet cache for key ${key}, promise rejected`, {
          message: error.message,
          key,
          ttl,
        });
      });
  }

  /**
   * Since a user can pass in any value, we check to see if value is a function that needs to be executed
   * Then we check if the function returns a Promise, if it doesnt we will wait for the result of the Promise
   */
  getValueIfFunc(value: any): Promise<?any> {
    return new Promise((resolve, reject) => {
      if (_.isFunction(value)) {
        const result = value();

        if (result.isPending) {
          // Promise was result of executing function
          return result
            .then(resolve);
        }

        // Either the result of a function was another function or a scalar result
        // Recurse until no functions returned
        return resolve(this.getValueIfFunc(result));
      }

      return resolve(value);
    });
  }

  /**
   * Determine whether we should use memory or Redis for the caching engine
   */
  getCachingEngine(): {engine: any, host?: string, port?: string, password?: ?string, partition: string} {
    const partition = `distraught-${_.snakeCase(process.env.APP_NAME)}`;
    if (process.env.REDIS_URL) {
      const redisConfig = require('url').parse(process.env.REDIS_URL);
      return {
        engine: require('catbox-redis'),
        host: redisConfig.hostname,
        port: redisConfig.port,
        password: redisConfig.auth ? redisConfig.auth.split(':').pop() : void 0,
        partition,
      };
    }

    return {
      engine: require('catbox-memory'),
      partition,
    };
  }
}

export const cache = new Cache();
