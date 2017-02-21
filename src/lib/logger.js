// @flow
import {map, concat} from 'lodash';
import logentries from 'logentries';
import chalk from 'chalk';
import moment from 'moment';

class Logger {
  le: {
    logger: Function,
    debug: Function,
  };

  constructor() {
    if (process.env.LOGENTRIES_TOKEN) {
      this.le = logentries.logger({
        token: process.env.LOGENTRIES_TOKEN,
      });

      this.le.on('error', (err) => {
        console.error('Unable to save logs to logentries', err); // eslint-disable-line
      });
    }
  }

  log(): void {
    const messages = map(arguments, chalk.stripColor);

    if (this.le) {
      this.le.debug(JSON.stringify(messages));
    }
    console.log.apply(this, concat(chalk.bold.white(moment().format('hh:mm A')), ...arguments)); // eslint-disable-line
  }
}

const logger = new Logger();
export const log = logger.log.bind(logger);
