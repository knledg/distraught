// @flow
const _ = require('lodash');
const chalk = require('chalk');
const raven = require('raven');
const moment = require('moment');
const Logger = require('le_node');
const PrettyError = require('pretty-error');

const pe = new PrettyError();

const cfg = require('./config').cfg;

/**
 * Create a `log()` Fn, that takes any amount of arguments and logs them to STDOUT
 * In Sentry, logs can be pulled in as part of the Sentry Error's context
 * Also can be used in combination with `chalk` to add colored errors
 */
let le;
if (process.env.LOGENTRIES_TOKEN) {
  le = new Logger({
    token: process.env.LOGENTRIES_TOKEN,
  });

  le.on('error', (err) => {
    console.error('Unable to save logs to logentries', err); // eslint-disable-line
  });
}

function log(...args: any): void {
  if (le) {
    const messages = _.map(args, argument => chalk.stripColor(argument));
    le.debug(JSON.stringify(messages));
  }
  console.log.apply(this, _.concat([moment().format('h:mma')], args)); // eslint-disable-line
}

/**
 * logErr - Give an Error and an optional object to assist with debugging
 *          Reports to Sentry if SENTRY_DSN is set
 *          Otherwise log to STDOUT with a potentially modified stack trace
 * @param {Error} err
 * @param {Object} extra
 *
 * Ex:
 * logErr(new Error('Something went wrong with CSV Upload'), {fileId: 1})
 */
function logErr(err: Error, extra: Object = {}): void {
  if (process.env.SENTRY_DSN) {
    const ravenPayload: Object = {
      extra: _.omit(extra, 'user'),
    };
    if (extra.user) {
      ravenPayload.user = extra.user;
    }
    raven.captureException(err, ravenPayload);
  } else {
    let stringified;
    try {
      stringified = JSON.stringify(extra);
    } catch (jsonStringifyErr) {} // eslint-disable-line

    let stack = err.stack;
    if (cfg && cfg.ignoredStackTraceLines && cfg.ignoredStackTraceLines.length) {
      stack = _.reduce(err.stack.split('\n'), (modifiedStackTrace, line) => {
        const shouldIncludeLine = _.reduce(cfg.ignoredStackTraceLines, (memo2, strippedStackLine) => {
          if (!memo2) {
            return memo2;
          }
          return line.indexOf(strippedStackLine) === -1;
        }, true);

        if (shouldIncludeLine) {
          modifiedStackTrace.push(line);
        }
        return modifiedStackTrace;
      }, []).join('\n');
    }

    err.stack = stack; // eslint-disable-line
    log(pe.render(err), chalk.cyan('- ') + chalk.cyan(stringified || extra) + chalk.cyan('\n'));
  }
}

/**
 * Assert an object has the required keys, keys can be deeply needed strings
 *
 * Ex:
 * assertKeys(
 *  {one: 1, two: 2, three: false, four: null, five: {nested: 1}},
 *  ['one', 'two', 'three', 'four', 'five.nested'],
 * )
 */
function assertKeys(payload: Object, keys: Array<string> = []): boolean {
  const errors = _.reduce(keys, (memo, key) => {
    if (_.get(payload, key) === undefined) {
      memo.push(`missing key: ${key}`);
    }
    return memo;
  }, []);

  if (errors.length) {
    logErr(new Error('Object missing required keys'), {payload, errors});
  }
  return !errors.length;
}

module.exports = {
  log,
  logErr,
  assertKeys,
};
