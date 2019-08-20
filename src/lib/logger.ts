import { concat, omit, reduce, get } from "lodash";
import raven from "raven";
import moment from "moment";
import PrettyError from "pretty-error";

const chalk = require("chalk");

const pe = new PrettyError();

const cfg = require("./config").cfg;

function log(...args: any): void {
  console.log.apply(this, concat([moment().format("h:mma")], args)); // eslint-disable-line
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
      extra: omit(extra, "user"),
    };
    if (extra.user) {
      ravenPayload.user = extra.user;
    }
    try {
      // Raven errors do not throw
      // Callback us used to capture the raven error and log the original error.
      // Example of an error from sentry is : Rate Limiting
      raven.captureException(err, ravenPayload, (sentryError) => {
        if (sentryError) {
          log(pe.render(err)); // log original error because sentry logging failed
        }
      });
    } catch (captureExceptionErr) {
      log(pe.render(captureExceptionErr)); // log error we received tried to send to Sentry
      log(pe.render(err)); // log original error
    }
  } else {
    let stringified;
    try {
      stringified = JSON.stringify(extra);
    } catch (jsonStringifyErr) {} // eslint-disable-line

    let stack = err.stack;
    if (
      cfg &&
      cfg.ignoredStackTraceLines &&
      cfg.ignoredStackTraceLines.length
    ) {
      stack = reduce(
        err.stack.split("\n"),
        (modifiedStackTrace, line) => {
          const shouldIncludeLine = reduce(
            cfg.ignoredStackTraceLines,
            (memo2, strippedStackLine) => {
              if (!memo2) {
                return memo2;
              }
              return line.indexOf(strippedStackLine) === -1;
            },
            true
          );

          if (shouldIncludeLine) {
            modifiedStackTrace.push(line);
          }
          return modifiedStackTrace;
        },
        []
      ).join("\n");
    }

    err.stack = stack; // eslint-disable-line
    log(
      pe.render(err),
      chalk.cyan("- ") + chalk.cyan(stringified || extra) + chalk.cyan("\n")
    );
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
  const errors = reduce(
    keys,
    (memo, key) => {
      if (get(payload, key) === undefined) {
        memo.push(`missing key: ${key}`);
      }
      return memo;
    },
    []
  );

  if (errors.length) {
    logErr(new Error("Object missing required keys"), { payload, errors });
  }
  return !errors.length;
}

module.exports = {
  log,
  logErr,
  assertKeys,
};
