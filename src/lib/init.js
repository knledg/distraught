// @flow
const { merge, each, keys, omit } = require("lodash");

let { db, heretic, cache, cfg } = require("./config");

const addHeretic = require("./heretic").addHeretic;
const addCache = require("./cache").addCache;
const addDBConnection = require("./db").addDBConnection;

type Config = {
  pugOptions?: {
    basedir: string,
  },
  email?: {
    devEmail?: null | string,
    guardedEnvironments?: Array<string>,
  },
  cache?: Object,
  db?: Object,
  heretic?: Object,
  captureUncaught?: boolean,
  captureUnhandled?: boolean,
  ignoredStackTraceLines?: Array<string>,
  pathToServerErrorTemplate?: null | string,
};

function init(config: Config = {}): void {
  cfg = merge(cfg, config);

  if (cfg.captureUncaught) {
    process.on("uncaughtException", require("./logger").logErr);
  }
  if (cfg.captureUnhandled) {
    process.on("unhandledRejection", require("./logger").logErr);
  }

  if (cfg.db) {
    each(omit(cfg.db, keys(db)), (options, name) =>
      addDBConnection(name, options, db)
    );
  }

  if (cfg.cache) {
    each(omit(cfg.cache, keys(cache)), (options, name) =>
      addCache(name, options, cache)
    );
  }

  if (cfg.heretic) {
    each(omit(cfg.heretic, keys(heretic)), (options, name) =>
      addHeretic(name, options, heretic, db)
    );
  }
}

module.exports = { init };
