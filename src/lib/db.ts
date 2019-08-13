// @flow
const chalk = require("chalk");
const clone = require("lodash").clone;
const knex = require("knex");
const merge = require("lodash").merge;

const log = require("./logger").log;

type ConnectionOptsType = {
  debug: ?any,
  connection: string,
  pool?: {
    min: number,
    max: number,
  },
};

const connectionOptionDefaults = {
  debug: false,
  client: "pg",
  pool: {
    min: 2,
    max: process.env.DB_CONNECTION_POOL_MAX || 10,
  },
};

function enableSQLLogging(
  knexInstance: Function,
  connectionName: string
): void {
  const runningQueries = {};
  knexInstance.on("query", (query) => {
    runningQueries[query.__knexQueryUid] = Date.now();
  });

  knexInstance.on("query-response", (response, query) => {
    let totalTimeInMS = chalk.green("unknown execution time");

    if (runningQueries[query.__knexQueryUid]) {
      totalTimeInMS = chalk.green(
        `${Date.now() - runningQueries[query.__knexQueryUid]}ms`
      );
      delete runningQueries[query.__knexQueryUid];
    }

    if (query.sql && query.bindings && query.bindings.length) {
      const oldSql = clone(query.sql);
      const bindings = clone(query.bindings);
      const sql = oldSql.replace(/\$\d+/gi, () => {
        return knexInstance.raw("?", [bindings.shift()]);
      });

      log(chalk.blue(`[${connectionName}]`), chalk.magenta(sql), totalTimeInMS);
    } else if (query.sql) {
      log(
        chalk.blue(`[${connectionName}]`),
        chalk.magenta(query.sql),
        totalTimeInMS
      );
    }
  });
}

function addDBConnection(
  name: string,
  options: ConnectionOptsType,
  db: Object
): Function {
  if (db[name]) {
    log(chalk.yellow.bold(`DB connection ${name} already added`));
    return db[name];
  }

  const knexInstance = knex(merge({}, connectionOptionDefaults, options));

  if (process.env.KNEX_DEBUG) {
    enableSQLLogging(knexInstance, name);
  }

  db[name] = knexInstance;

  return knexInstance;
}

module.exports = { addDBConnection };
