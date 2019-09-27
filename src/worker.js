/* @flow */
const { each, isFunction } = require("lodash");
let Heretic;
const chalk = require("chalk");
const { log } = require("./lib/logger");
const Raven = require("raven");

type QueueType = {|
  name: string,
  concurrency?: number,
  isEnabled: Function | boolean,
  handler: Function,
  alertAt?: number,
  killAt?: number,
  onKilled?: Function,
  debug?: boolean,
|};
type OptionsType = {|
  requiredEnv?: any,
  queues: Array<QueueType>,
  heretic: Heretic,
  ttl?: number,
|};

const pausedQueues = {};

const workerServer = function workerServer(options: OptionsType) {
  if (process.env.SENTRY_DSN) {
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true,
      environment: process.env.NODE_ENV,
      captureUnhandledRejections: true,
    }).install();
  }

  if (!Heretic) {
    Heretic = require("@smartrent/heretic");
  }

  return {
    heretic: options.heretic,
    ttlReached: false,

    enqueue(queueName: string, payload: any) {
      return this.heretic.enqueue(queueName, payload);
    },

    retry(jobId: number) {
      return this.heretic.retry(jobId);
    },

    pauseFor(queueName: string, timeoutInMS: number): Promise<void> {
      const queue = this.heretic.queues[queueName];
      if (!queue) {
        return Promise.resolve();
      }

      log(chalk.bold.blue(queueName), chalk.yellow.bold("[pausing]"));
      return queue
        .pause()
        .then(() => {
          log(chalk.bold.blue(queueName), chalk.yellow.bold("[paused]"));

          if (timeoutInMS && !pausedQueues[queueName]) {
            setTimeout(() => {
              log(chalk.bold.blue(queueName), chalk.green.bold("[resuming]"));
              return this.resume(queueName);
            }, timeoutInMS);
            pausedQueues[queueName] = true;
          }
        })
        .catch((err) => {
          log(
            chalk.bold.red(queueName),
            chalk.white.bold(err.message),
            chalk.red.bold("[unable to pause]")
          );
          throw err;
        });
    },

    resume(queueName: string): Promise<void> {
      const queue = this.heretic.queues[queueName];
      if (!queue) {
        return Promise.resolve();
      }

      return queue
        .start()
        .then(() => {
          log(chalk.bold.blue(queueName), chalk.green.bold("[resumed]"));
          if (pausedQueues[queueName]) {
            delete pausedQueues[queueName];
          }
        })
        .catch((err) => {
          log(
            chalk.bold.red(queueName),
            chalk.white.bold(err.message),
            chalk.red.bold("[unable to resume]")
          );
          throw err;
        });
    },

    setAlertAt(queue: QueueType) {
      if (!queue.alertAt) {
        return null;
      }

      return setTimeout(function() {
        log(
          chalk.yellow.bold(
            `A job in ${queue.name} is taking a long time to fulfill`
          ),
          chalk.green.bold("[alert]")
        );
      }, queue.alertAt);
    },

    setKillAt(queue: QueueType, job: Object, done: Function) {
      if (!queue.killAt) {
        return null;
      }

      return setTimeout(function() {
        log(
          chalk.red.bold(
            `Killing job in ${queue.name}, exceeded maximum timeout`
          ),
          chalk.green.bold("[killing-job]"),
          job
        );

        const error = new Error(
          `Exceeded maximum timeout of ${Number(queue.killAt)} milleseconds`
        );
        done(error);

        if (queue.onKilled) {
          queue.onKilled({
            name: queue.name,
            job,
          });
        }
      }, queue.killAt);
    },

    listenForErrors() {
      // the 'jobError' event happens when a job message is published in RabbitMQ that
      // can never be handled correctly (malformed JSON, job id doesn't exist in the
      // database, etc.). The message will be dead-lettered for later inspection (by you)
      this.heretic.on("jobError", (err) => {
        log(chalk.red.bold("Error with job!"), err);
        if (process.env.SENTRY_DSN) {
          Raven.captureException(err);
        }
      });

      // the 'jobFailed' event happens when a job fails, but in a recoverable way. it
      // will be automatically retried up to the maximum number of retries.
      this.heretic.on("jobFailed", (savedJob, err) => {
        log(chalk.red.bold("Job execution failed!"), err);
        if (process.env.SENTRY_DSN) {
          Raven.captureException(err, {
            extra: {
              payload: savedJob && savedJob.payload,
              id: savedJob && savedJob.id,
            },
          });
        }
      });
    },

    /**
     * [dequeue - Given an array of queue objects, we start processing those queue items (if enabled)
     *            With a default concurrency of 1]
     */
    dequeue() {
      if (!(options.queues && options.queues.length)) {
        throw new Error(
          "Please specify one or many queues to begin processing on"
        );
      }

      each(options.queues, (queue) => {
        let isEnabled = true;

        if (queue.isEnabled && isFunction(queue.isEnabled)) {
          isEnabled = queue.isEnabled(); // If function, call fn to get bool result
        } else if (queue.hasOwnProperty("isEnabled")) {
          isEnabled = queue.isEnabled; // Standard bool
        }

        if (isEnabled) {
          log(chalk.bold.blue(queue.name), chalk.green.bold("[enabled]"));
          this.heretic.process(
            queue.name,
            queue.concurrency || 1,
            (job: Object, message: string, done: Function) => {
              if (queue.debug) {
                log(chalk.cyan.bold(queue.name), chalk.blue.bold("[started]"));
              }

              const doIt = () => {
                if (process.env.SENTRY_DSN) {
                  Raven.setContext({
                    payload: job.payload,
                  });
                }
                const executingPromise = queue.handler(job, message, done);
                const alertAt = this.setAlertAt(queue, executingPromise);
                const killAt = this.setKillAt(queue, job, done);

                return executingPromise
                  .then((result) => {
                    clearTimeout(alertAt);
                    clearTimeout(killAt);

                    if (queue.debug) {
                      log(
                        chalk.cyan.bold(`${queue.name}`),
                        chalk.green.bold("[completed]")
                      );
                    }
                    return result;
                  })
                  .then(() => {
                    if (this.ttlReached) {
                      log(
                        chalk.cyan.bold(`${queue.name}`),
                        "Triggering exit",
                        chalk.red.bold("[timeout reached]")
                      );
                      this.heretic.on("jobComplete", () => {
                        process.exit(0);
                      });
                    }
                  });
              };

              if (process.env.SENTRY_DSN) {
                Raven.context(() => {
                  doIt();
                });
              } else {
                doIt();
              }
            }
          );
        } else {
          log(chalk.bold.blue(queue.name), chalk.red.bold("[disabled]"));
        }
      });
    },

    start() {
      this.listenForErrors();
      this.dequeue();
      if (options.ttl) {
        log(`Timeout set for ${Math.floor(options.ttl / (60 * 1000))} minutes`);
        setTimeout(() => {
          this.ttlReached = true;
        }, options.ttl);
      }
      return this.heretic.start();
    },
  };
};

module.exports = {
  workerServer,
};
