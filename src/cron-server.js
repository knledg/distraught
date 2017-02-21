/* @flow */
import {each, isFunction} from 'lodash';
import {GenericServer} from './lib/generic-server';
import {log} from './lib/logger';
import chalk from 'chalk';
import {CronJob} from 'cron';

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

export class CronServer extends GenericServer {
  options: OptionsType = {
    crons: [],
    requiredEnv: [],
  };

  /**
   * [cronTime - Starts an individual CronJob]
   * @type {[type]}
   */
  startCron({cronTime, onTick, name, start}:CronType): CronJob {
    return new CronJob({
      cronTime,
      onTick,
      start: start || true,
    });
  }

  constructor(options: OptionsType) {
    super(options);
    this.options = options;
  }

  /**
   * [startCrons - Given an array of cron objects, we start processing those cron items (if enabled)]
   */
  startCrons() {
    if (! (this.options.crons && this.options.crons.length)) {
      throw new Error('Please specify one or many crons to begin processing on');
    }

    each(this.options.crons, cron => {
      let isEnabled = true;

      if (cron.isEnabled && isFunction(cron.isEnabled)) {
        isEnabled = cron.isEnabled(); // If function, call fn to get bool result
      } else if (cron.hasOwnProperty('isEnabled')) {
        isEnabled = cron.isEnabled; // Standard bool
      }

      if (isEnabled) {
        this.startCron(cron);
        log(chalk.bold.blue(cron.name), chalk.green.bold('[enabled]'));
      } else {
        log(chalk.bold.blue(cron.name), chalk.red.bold('[disabled]'));
      }
    });
  }

  start() {
    return this.startCrons();
  }
}
