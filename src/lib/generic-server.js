/* @flow */
import assertEnvironment from 'assert-env';
import chalk from 'chalk';
import {log} from './logger';

const REQUIRED_ENV = [
  'NODE_ENV', 'APP_NAME', 'CRYPTO_ALGO', 'CRYPTO_KEY',
];

export class GenericServer {
  options: any = {};

  constructor(options: any) {
    this.options = options;
    this.assertEnv();
  }

  assertEnv() {
    // Distraught Specific Required Environment Variables
    try {
      assertEnvironment(REQUIRED_ENV);
    } catch (err) {
      log(chalk.red.bold(err.message.substr(0, err.message.length - 1)));
      process.exit(1);
    }

    if (! (this.options.requiredEnv && this.options.requiredEnv.length)) {
      return;
    }

    // APP Specific
    try {
      assertEnvironment(this.options.requiredEnv);
    } catch (err) {
      log(chalk.red.bold(err.message.substr(0, err.message.length - 1)));
      process.exit(1);
    }
  }
}
