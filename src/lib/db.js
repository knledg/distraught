// @flow
const merge = require('lodash').merge;
const chalk = require('chalk');
const knex = require('knex');
const log = require('./logger').log;
const clone = require('lodash').clone;

type ConnectionOptsType = {
  debug: ?any,
  connection: string,
  pool?: {
    min: number,
    max: number,
  }
};

const connectionOptionDefaults = {
  debug: false,
  client: 'pg',
  pool: {
    min: 2,
    max: process.env.DB_CONNECTION_POOL_MAX || 10,
  },
};

const db = {};
const enableSQLLogging = function enableSQLLogging(knexInstance: Function, connectionName: string): void {
  const runningQueries = {};
  knexInstance.on('query', (query) => {
    runningQueries[query.__knexQueryUid] = Date.now();
  });

  knexInstance.on('query-response', function(response, query, builder) {
    let totalTimeInMS = chalk.green.bold('unknown execution time');

    if (runningQueries[query.__knexQueryUid]) {
      totalTimeInMS = chalk.green.bold(`${Date.now() - runningQueries[query.__knexQueryUid]}ms`);
      delete runningQueries[query.__knexQueryUid];
    }

    if (query.sql && query.bindings && query.bindings.length) {
      const oldSql = clone(query.sql);
      const bindings = clone(query.bindings);
      const sql = oldSql.replace(/\$\d+/gi, (x) => {
        return knexInstance.raw('?', [bindings.shift()]);
      });

      log(chalk.blue(`[${connectionName}]`), chalk.magenta.bold(sql), totalTimeInMS);
    } else if (query.sql) {
      log(chalk.blue(`[${connectionName}]`), chalk.magenta.bold(query.sql), totalTimeInMS);
    }
  });
};

module.exports = {
  enableSQLLogging,
  db,
  addDBConnection(connectionName: string, connOpts: ConnectionOptsType): Function {
    if (db[connectionName]) {
      log(chalk.yellow.bold(`Tried adding db connection, ${connectionName}, but it was already set`));
      return db[connectionName];
    }

    const knexInstance = knex(merge({}, connectionOptionDefaults, connOpts));

    if (process.env.KNEX_DEBUG) {
      enableSQLLogging(knexInstance, connectionName);
    }

    db[connectionName] = knexInstance;

    return knexInstance;
  },
};
