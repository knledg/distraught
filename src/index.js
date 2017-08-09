// @flow
const chalk = require('chalk');
const {httpServer} = require('./web');
const {enableSQLLogging, addDBConnection, db} = require('./lib/db');
const {addEmailTransport, sendEmail} = require('./lib/email');
const {slack} = require('./lib/slack');
const {sg, sgHelper} = require('./lib/sendgrid');
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
const {toSnakeCase, toCamelCase, encrypt, decrypt} = require('./lib/transformations');
const {SECOND, MINUTE, HOUR} = require('./lib/constants');
const {cronServer} = require('./cron');
const {workerServer} = require('./worker');

module.exports = {
  cronServer,
  workerServer,
  toSnakeCase,
  toCamelCase,
  encrypt,
  decrypt,
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
  sg,
  sgHelper,

  SECOND,
  MINUTE,
  HOUR,
};
