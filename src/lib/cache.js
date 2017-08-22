// @flow

const _ = require('lodash');
const chalk = require('chalk');
const {MINUTE} = require('./constants');

const redis = require('redis');
const log = require('./logger').log;

const cache = {};

exports.cache = cache;
exports.addCache = function(name: string, options: {connection: string}) {
  const client = redis.createClient({url: options.connection});

  client.on('error', (err) => log(chalk.red.bold(err)));

  cache[name] = {

    scan(pattern: string = '*', cursor: number = 0, arrayOfKeys: Array<string> = []): Promise<Array<string>> {
      return new Promise((resolve, reject) => {
        if (process.env.DEBUG_CACHE) {
          log(chalk.cyan.bold('Scanning keys in cache'));
        }
        client.scan(cursor, 'MATCH', pattern, (err, [newCursor, newArrayOfKeys]: {newCursor: string, newArrayOfKeys: Array<string>}) => {
          if (err) {
            return reject(err);
          }

          if (newCursor === '0') {
            return resolve(arrayOfKeys.concat(newArrayOfKeys));
          }
          return this.scan(pattern, Number(newCursor), arrayOfKeys.concat(newArrayOfKeys))
            .then(resolve);
        });
      });
    },

    invalidateMany(pattern: string): Promise<*> {
      return new Promise((resolve, reject) => {
        return client.keys(pattern, (err, keys) => {
          if (process.env.DEBUG_CACHE) {
            log(chalk.cyan.bold(`Invalidating ${keys.length} keys for pattern: ${pattern}`));
          }
          if (err) {
            return reject(err);
          }

          if (keys.length) {
            return this.invalidate(keys)
              .then(resolve)
              .catch(reject);
          }

          return resolve();
        });

      });
    },

    /**
     * [key - pass in a single key string or an array of key strings]
     */
    invalidate(key: string|Array<string>): Promise<*> {
      return new Promise((resolve, reject) => {
        client.del(key, (err, res) => {
          return err ? reject(err) : resolve(res);
        });
      });
    },

    get(key: string): Promise<?any|Error> {
      return new Promise((resolve, reject) => {
        return client.get(key, (err, res) => {
          return err ? reject(err) : resolve(res);
        });
      });
    },

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
              .then(resolve)
              .catch((err) => reject(err));
          }

          // Either the result of a function was another function or a scalar result
          // Recurse until no functions returned
          return resolve(this.getValueIfFunc(result));
        }
        return resolve(value);
      });
    },

    set(key: string, value: any, ttl: number = MINUTE * 5): Promise<*> {
      return new Promise((resolve, reject) => {
        return this.getValueIfFunc(value)
          .then((res) => {
            return client.set(key, JSON.stringify(res), 'PX', ttl, (err) => {
              return err ? Promise.reject(err) : resolve(res);
            });
          })
          .catch((err) => reject(err)); // Must reject promises or it will hang and throw an uncaught exception error
      });
    },

    getOrSet(key: string, value: any, ttl?: number): Promise<*> {
      return this.get(key)
        .then((getResult) => {
          if (process.env.DEBUG_CACHE) {
            const hitOrMiss = getResult ? 'hit' : 'missed';
            log(chalk.cyan.bold(`Cache ${hitOrMiss}: ${key}`));
          }
          return getResult ? JSON.parse(getResult) : this.set(key, value, ttl);
        }); // don't catch, let error fall through, it probably wasn't Redis
    },
  };
};

