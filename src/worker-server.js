/* @flow */
import {each, isFunction, startCase} from 'lodash';
import Heretic from 'heretic';
import rollbar from 'rollbar';
import Promise from 'bluebird';
import chalk from 'chalk';

import {log} from './lib/logger';
import {GenericServer} from './lib/generic-server';


type QueueType = {
  name: string,
  concurrency?: number,
  isEnabled: Function|boolean,
  handler: Function,
  alertAt?: number,
  killAt?: number,
  onKilled?: Function,
  debug?: boolean,
};
type OptionsType = {
  requiredEnv?: any,
  queues: Array<QueueType>,
  heretic: Heretic,
};

const pausedQueues = {};

export class WorkerServer extends GenericServer {
  options: OptionsType = {
    queues: [],
    requiredEnv: [],
  };
  heretic: Heretic;

  initHeretic() {
    this.heretic = this.options.heretic;
  }

  enqueue(queueName: string, payload: any) {
    return this.heretic.enqueue(queueName, payload);
  }

  retry(jobId: number) {
    return this.heretic.retry(jobId);
  }

  pauseFor(queueName: string, timeoutInMS: number) {
    const queue = this.heretic.queues[queueName];
    if (! queue) {
      return Promise.resolve();
    }

    log(chalk.bold.blue(queueName), chalk.yellow.bold('[pausing]'));
    return queue
      .pause()
      .then(() => {
        log(chalk.bold.blue(queueName), chalk.yellow.bold('[paused]'));

        if (timeoutInMS && ! pausedQueues[queueName]) {
          setTimeout(function() {
            log(chalk.bold.blue(queueName), chalk.green.bold('[resuming]'));
            return this.resume(queueName);
          }, timeoutInMS);
          pausedQueues[queueName] = true;
        }
      })
      .catch((err) => {
        log(chalk.bold.red(queueName), chalk.white.bold(err.message), chalk.red.bold('[unable to pause]'));
        throw err;
      });
  }

  resume(queueName: string) {
    const queue = this.heretic.queues[queueName];
    if (! queue) {
      return Promise.resolve();
    }

    return queue
      .start()
      .then(() => {
        log(chalk.bold.blue(queueName), chalk.green.bold('[resumed]'));
        if (pausedQueues[queueName]) {
          delete pausedQueues[queueName];
        }
      })
      .catch((err) => {
        log(chalk.bold.red(queueName), chalk.white.bold(err.message), chalk.red.bold('[unable to resume]'));
        throw err;
      });
  }

  constructor(options: OptionsType) {
    super(options);
    this.options = options;

    this.initHeretic();
    this.listenForErrors();
  }

  setAlertAt(queue: QueueType) {
    if (! queue.alertAt) {
      return null;
    }

    return setTimeout(function() {
      log(chalk.yellow.bold(`A job in ${queue.name} is taking a long time to fulfill`), chalk.green.bold('[alert]'));
    }, queue.alertAt);
  }

  setKillAt(queue: QueueType, job: Object, done: Function) {
    if (! queue.killAt) {
      return null;
    }

    return setTimeout(function() {
      log(chalk.red.bold(`Killing job in ${queue.name}, exceeded maximum timeout`), chalk.green.bold('[killing-job]'), job);

      const error = new Error(`Exceeded maximum timeout of ${Number(queue.killAt)} milleseconds`);
      done(error);

      if (queue.onKilled) {
        queue.onKilled({
          name: queue.name,
          job,
        });
      }
    }, queue.killAt);
  }

  listenForErrors() {
    // the 'jobError' event happens when a job message is published in RabbitMQ that
    // can never be handled correctly (malformed JSON, job id doesn't exist in the
    // database, etc.). The message will be dead-lettered for later inspection (by you)
    this.heretic.on('jobError', err => {
      rollbar.handleErrorWithPayloadData(new Error(`Job error for ${startCase(err.queue_name)}`), {level: 'error', custom: err});
      log(chalk.red.bold('Error with job!'), err);
    });

    // the 'jobFailed' event happens when a job fails, but in a recoverable way. it
    // will be automatically retried up to the maximum number of retries.
    this.heretic.on('jobFailed', err => {
      rollbar.handleErrorWithPayloadData(new Error(`Job failed for ${startCase(err.queue_name)}`), {level: 'error', custom: err});
      log(chalk.red.bold('Job execution failed!'), err);
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
        log(chalk.bold.blue(queue.name), chalk.green.bold('[enabled]'));
        this.heretic.process(queue.name, queue.concurrency || 1, (job: Object, message: string, done: Function) => {
          if (queue.debug) {
            log(chalk.cyan.bold(`${queue.name} ${job.payload.id}`), chalk.blue.bold('[started]'));
          }

          const executingPromise = queue.handler(job, message, done);
          const alertAt = this.setAlertAt(queue, executingPromise);
          const killAt = this.setKillAt(queue, job, done);

          return executingPromise
            .tap((result) => {
              if (queue.debug && ! (result instanceof Error)) {
                log(chalk.cyan.bold(`${queue.name}`), chalk.green.bold('[completed]'));
              }
              return;
            })
            .finally(() => {
              clearTimeout(alertAt);
              clearTimeout(killAt);
            });
        });
      } else {
        log(chalk.bold.blue(queue.name), chalk.red.bold('[disabled]'));
      }
    });
  }

  start() {
    this.dequeue();
    return this.heretic.start();
  }
}