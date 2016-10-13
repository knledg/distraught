/* @flow */
import {each, isFunction} from 'lodash';
import {heretic} from '../lib/heretic';
import {GenericServer} from '../lib/generic-server';
import chalk from 'chalk';

type QueueType = {
  name: string,
  concurrency?: number,
  isEnabled: Function|boolean,
  handler: Function,
};
type OptionsType = {
  requiredEnv?: any,
  queues: Array<QueueType>,
};

export class WorkerServer extends GenericServer {
  options: OptionsType = {
    queues: [],
    requiredEnv: [],
  };

  static enqueue(queueName: string, payload: any) {
    return heretic.enqueue(queueName, payload);
  }

  static retry(jobId: number) {
    return heretic.retry(jobId);
  }

  constructor(options: OptionsType) {
    super(options);
    this.options = options;
    this.listenForErrors();
  }

  listenForErrors() {
    // the 'jobError' event happens when a job message is published in RabbitMQ that
    // can never be handled correctly (malformed JSON, job id doesn't exist in the
    // database, etc.). The message will be dead-lettered for later inspection (by you)
    heretic.on('jobError', err => {
      console.error(chalk.red.bold('Error with job!'), err); // eslint-disable-line
    });

    // the 'jobFailed' event happens when a job fails, but in a recoverable way. it
    // will be automatically retried up to the maximum number of retries.
    heretic.on('jobFailed', err => {
      console.error(chalk.red.bold('Job execution failed!'), err); // eslint-disable-line
    });
  }

  /**
   * [dequeue - Given an array of queue objects, we start processing those queue items (if enabled)
   *            With a default concurrency of 1]
   */
  dequeue() {
    if (! (this.options.queues && this.options.queues.length)) {
      throw new Error('Please specify one or many queues to begin processing on');
    }

    each(this.options.queues, queue => {
      let isEnabled = true;

      if (queue.isEnabled && isFunction(queue.isEnabled)) {
        isEnabled = queue.isEnabled(); // If function, call fn to get bool result
      } else if (queue.hasOwnProperty('isEnabled')) {
        isEnabled = queue.isEnabled; // Standard bool
      }

      if (isEnabled) {
        heretic.process(queue.name, queue.concurrency || 1, queue.handler);
        console.log(chalk.bold.blue(queue.name), chalk.green.bold('[enabled]')); // eslint-disable-line
      } else {
        console.log(chalk.bold.blue(queue.name), chalk.red.bold('[disabled]')); // eslint-disable-line
      }
    });
  }

  start() {
    this.dequeue();
    return heretic.start();
  }
}
