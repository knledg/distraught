/* @flow */
/* Return singleton instance of knex, which communicates with your database */
// $FlowFixMe - commonjs executable module not found in knex
export const knex = require('knex')({
  debug: process.env.KNEX_DEBUG,
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: process.env.DB_CONNECTION_POOL_MAX || 10,
  },
});
