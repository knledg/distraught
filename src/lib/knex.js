/* @flow */

const chalk = require('chalk');
const log = require('./logger').log;
const clone = require('lodash').clone;

/* Return singleton instance of knex, which communicates with your database */
// $FlowFixMe - commonjs executable module not found in knex
export const knex = require('knex')({
  debug: process.env.KNEX_DEFAULT_DEBUG,
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: process.env.DB_CONNECTION_POOL_MAX || 10,
  },
});


if (process.env.KNEX_DEBUG) {
  knex.on('query', (query) => {
    if (query.sql && query.bindings && query.bindings.length) {
      const oldSql = clone(query.sql);
      const bindings = clone(query.bindings);
      const sql = oldSql.replace(/\?/gi, (x) => {
        return bindings.shift();
      });

      log(chalk.magenta.bold(sql));
    } else if (query.sql) {
      log(chalk.magenta.bold(query.sql));
    }
  });
}
