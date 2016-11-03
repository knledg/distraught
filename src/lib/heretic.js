/* @flow */
// $FlowFixMe
import Heretic from 'heretic';
import {knex} from './knex';

export const heretic = new Heretic(process.env.AMQP_URL, knex, {
  socketOptions: {
    clientProperties: {
      Application: 'Workers',
    },
  },
  writeOutcomes: false,
});
