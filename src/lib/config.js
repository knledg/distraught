// @flow

let cfg = {
  ignoredStackTraceLines: [],
  captureUncaught: false,
  captureUnhandled: false,
  heretic: {},
  db: {},
  cache: {},
  pugOptions: {
    basedir: '',
  },
  email: {
    devEmail: null,
    guardedEnvironments: [],
  },
  pathToServerErrorTemplate: null,
  env: process.env,
};
const cache = {};
const heretic = {};
const db = {};

module.exports = {cfg, cache, db, heretic};
