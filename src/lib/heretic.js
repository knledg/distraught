/* @flow */
// $FlowFixMe
import Heretic from 'heretic';
import {knex} from './knex';

const heretic = new Heretic(process.env.AMQP_URL, knex, {
  socketOptions: {
    clientProperties: {
      Application: 'Workers',
    },
  },
});

export const worker = {
  enqueue(queueName: string, payload: any) {
    return heretic.enqueue(queueName, payload);
  },

  dequeue(queueName: string, concurrency: number, handler: Function) {
    return heretic.dequeue(queueName, concurrency, handler);
  },

  retry(jobId: number) {
    return heretic.retry(jobId);
  },
};
