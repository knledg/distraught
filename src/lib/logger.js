// @flow
const _ = require('lodash');
const chalk = require('chalk');
const moment = require('moment');
const Logger = require('le_node');

function logger(options: {LOGENTRIES_TOKEN?: string}) {
  let le;

  if (options.LOGENTRIES_TOKEN) {
    le = new Logger({
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
  };
}

module.exports = {
  logger: logger,
  log: logger({LOGENTRIES_TOKEN: process.env.LOGENTRIES_TOKEN}),
};
