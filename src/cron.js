// @flow
const _ = require('lodash');
const {log} = require('./lib/logger');
const chalk = require('chalk');
const {CronJob} = require('cron');

type CronType = {
  name: string,
  cronTime: string,
  onTick: Function,
  start?: boolean,
  isEnabled?: Function|boolean,
};
type OptionsType = {
  requiredEnv?: any,
  crons: Array<CronType>,
};

const cronServer = function cronServer(options: OptionsType) {
  if (! (options.crons && options.crons.length)) {
    throw new Error('Please specify one or many crons to begin processing on');
  }

  _.each(options.crons, cron => {
    let isEnabled = true;

    if (cron.isEnabled && _.isFunction(cron.isEnabled)) {
      isEnabled = cron.isEnabled(); // If function, call fn to get bool result
    } else if (cron.hasOwnProperty('isEnabled')) {
      isEnabled = cron.isEnabled; // Standard bool
    }

    if (isEnabled) {
      new CronJob({
        cronTime: cron.cronTime,
        onTick: cron.onTick,
        start: cron.start || true,
      });
      log(chalk.bold.blue(cron.name), chalk.green.bold('[enabled]'));
    } else {
      log(chalk.bold.blue(cron.name), chalk.red.bold('[disabled]'));
    }
  });
}

module.exports = {
  cronServer,
};
