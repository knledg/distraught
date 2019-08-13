const chalk = require("chalk");
const { httpServer, jw, w } = require("./web");
const { slack } = require("./lib/slack");
const {
  sg,
  sgHelper,
  getOverriddenEmail,
  overrideEmail,
  sendEmail,
} = require("./lib/email");
const {
  fetchOne,
  fetchMany,
  create,
  createOne,
  update,
  updateOne,
} = require("./lib/queries");
const { log, logErr, assertKeys } = require("./lib/logger");
const {
  toSnakeCase,
  toSnakeCaseCached,
  toCamelCase,
  toCamelCaseCached,
  encrypt,
  decrypt,
  sanitizePhone,
  formatPhone,
  formatPrice,
  formatNumber,
  getProtocolAndHostname,
  getHostname,
  formatCap,
  formatAddress,
} = require("./lib/transformations");
const { SECOND, MINUTE, HOUR } = require("./lib/constants");
const { cronServer } = require("./cron");
const { workerServer } = require("./worker");
const { sendText } = require("./lib/voip");
const { request } = require("./lib/request");
const { createSocketConnection, emit } = require("./lib/socket");
const {
  getBucket,
  uploadFile,
  deleteFile,
  streamToBuffer,
} = require("./lib/storage");
const { renderPug } = require("./lib/template");
const { cfg, cache, db, heretic } = require("./lib/config");
const { init } = require("./lib/init");

module.exports = {
  cronServer,
  workerServer,

  toSnakeCase,
  toSnakeCaseCached,
  toCamelCase,
  toCamelCaseCached,
  encrypt,
  decrypt,
  sanitizePhone,
  formatPhone,
  formatPrice,
  formatCap,
  formatAddress,
  formatNumber,
  getProtocolAndHostname,
  getHostname,

  init,
  cfg,

  httpServer,
  w,
  jw,

  db,
  fetchMany,
  fetchOne,
  create,
  createOne,
  update,
  updateOne,

  slack,

  log,
  logErr,
  assertKeys,
  chalk,

  heretic,
  cache,

  createSocketConnection,
  emit,

  request,

  getBucket,
  uploadFile,
  deleteFile,
  streamToBuffer,

  renderPug,

  sg,
  sgHelper,
  getOverriddenEmail,
  overrideEmail,
  sendEmail,

  sendText,

  SECOND,
  MINUTE,
  HOUR,
};
