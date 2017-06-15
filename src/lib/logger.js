// @flow
const _ = require('lodash');
const chalk = require('chalk');
const moment = require('moment');
const logentries = require('le_node');

function Logger(options: {LOGENTRIES_TOKEN?: string}) {
  let le;

  if (options.LOGENTRIES_TOKEN) {
    le = logentries.logger({
      token: options.LOGENTRIES_TOKEN,
    });

    le.on('error', (err) => {
      console.error('Unable to save logs to logentries', err); // eslint-disable-line
    });
  }

  return function log(...args: any): void {
    if (le) {
      const messages = _.map(args, argument => chalk.stripColor(argument));
      le.debug(JSON.stringify(messages));
    }
    console.log.apply(this, _.concat(chalk.bold.white(moment().format('hh:mm A')), args)); // eslint-disable-line
  }
}

module.exports = {
  Logger: Logger,
  log: Logger({LOGENTRIES_TOKEN: process.env.LOGENTRIES_TOKEN}),
}
