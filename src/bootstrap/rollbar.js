/* @flow */
/* eslint-disable no-console,no-process-exit */
import rollbar from 'rollbar';
import chalk from 'chalk';
import {get} from 'lodash';

import {errorHandler} from '../lib/error-handler';
import {log} from '../lib/logger';

import type Promise from 'bluebird';

function getCustomPayload(err) {
  const payload = get(err, '__TErrorPayload', 'No Payload Specified, Catch The Error, Throw A TError And Pass A Payload Next Time. Syntax: `throw new TError(err, payload)`');
  let modifiedPayload;
  if (payload instanceof Error) {
    // It's not recommended to just pass an Error as the custom payload, but we will handle that nonetheless
    modifiedPayload = payload.message;
  } else {
    modifiedPayload = JSON.stringify(payload);
  }
  return chalk.blue.bold(modifiedPayload);
}

/**
 * [Listen to process log stream for uncaught errors or rejections and notify developers]
 */
if (process.env.ROLLBAR_TOKEN) {
  rollbar.init(process.env.ROLLBAR_TOKEN, {
    environment: process.env.NODE_ENV,
    root: process.cwd(),
    verbose: false,
    codeVersion: process.env.GIT_SHA,
    host: process.env.DYNO || require('os').hostname(),
    scrubHeaders: [
      'Authorization',
      'authorization',
      'Cookie',
      'cookie',
    ],
    scrubFields: [
      'password',
      'token',
    ],
  });

  process.on('uncaughtException', function(err: Error): void {
    log(chalk.red.bold('[Rollbar] Handling uncaught exception.'));
    log(chalk.red.bold(err.stack));

    errorHandler.error(err, function(err2: Error) {
      if (err2) {
        log(chalk.red.bold('[Rollbar] Encountered an error while handling an uncaught exception.'));
        log(chalk.red.bold(err.stack));
      }

      process.exit(1);
    });
  });

  process.on('unhandledRejection', function(err: Error, promise: Promise): void {
    log(chalk.red.bold(err.message), chalk.yellow.bold(err.stack), getCustomPayload(err));
    errorHandler.error(err);
  });
} else {
  process.on('unhandledRejection', function(err: Error, promise: Promise): void {
    log(chalk.red.bold(err.message), chalk.yellow.bold(err.stack), getCustomPayload(err));
  });

  process.on('uncaughtException', function(err: Error): void {
    log(chalk.red.bold(`Uncaught Exception: ${err.message}`), chalk.yellow(err.stack), getCustomPayload(err));
    process.exit(1);
  });
}
