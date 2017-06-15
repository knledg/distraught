// @flow

const chalk = require('chalk');
const {httpServer} = require('./web');
const {enableSQLLogging, addDBConnection, db} = require('./lib/db');
const {addEmailTransport, sendEmail} = require('./lib/email');
const {slack} = require('./lib/slack');
const {cache, addCache} = require('./lib/cache');
const {addHeretic, heretic} = require('./lib/heretic');
const {
  fetchOne,
  fetchMany,
  create,
  createOne,
  update,
  updateOne,
} = require('./lib/queries');
const {log} = require('./lib/logger');
const {toSnakeCase, toCamelCase} = require('./lib/transformations');
const {SECOND, MINUTE, HOUR} = require('./lib/constants');
const {cronServer} = require('./cron');
const {workerServer} = require('./worker');

module.exports = {
  cronServer,
  workerServer,
  toSnakeCase,
  toCamelCase,
  httpServer,
  enableSQLLogging,
  addDBConnection,
  db,
  addEmailTransport,
  sendEmail,
  fetchMany,
  fetchOne,
  create,
  createOne,
  update,
  updateOne,
  slack,
  log,
  chalk,
  addCache,
  addHeretic,
  heretic,
  cache,

  SECOND,
  MINUTE,
  HOUR
};
