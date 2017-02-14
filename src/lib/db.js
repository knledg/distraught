/* @flow */

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

export function enableSQLLogging(knexInstance: Function): void {
  knexInstance.on('query', (query) => {
    if (query.sql && query.bindings && query.bindings.length) {
      const oldSql = clone(query.sql);
      const bindings = clone(query.bindings);
      const sql = oldSql.replace(/\?/gi, (x) => {
        return knexInstance.raw('?', [bindings.shift()]);
      });

      log(chalk.magenta.bold(sql));
    } else if (query.sql) {
      log(chalk.magenta.bold(query.sql));
    }
  });
}

export const db = {};
export function addDBConnection(connectionName: string, connOpts: ConnectionOptsType): void {
  if (db[connectionName]) {
    log(chalk.yellow.bold(`Tried adding db connection, ${connectionName}, but it was already set`));
    return;
  }

  const knexInstance = knex(merge({}, connectionOptionDefaults, connOpts));

  if (process.env.KNEX_DEBUG) {
    enableSQLLogging(knexInstance);
  }

  db[connectionName] = knexInstance;
}
