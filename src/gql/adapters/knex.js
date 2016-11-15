  /* @flow */
import {camelCase, mapKeys, get} from 'lodash';
import chalk from 'chalk';
import {knex} from '../../lib/knex';
import {log} from '../../lib/logger';
import Promise from 'bluebird';

import type {Promise as PromiseType} from 'bluebird';

const MAX_LIMIT = 1000;

/**
 * [knexQuery - Adapter for Knex SQL Query Builder
 *              Builds and executes queries
 *              Outputs consistent results for a record / collection
 *              Handles defaults]
 * @param  {object}        filters user-specified filters
 * @param  {function}      query knex query builder instance
 * @return {promise}       record|collection {records: [], count}
 */
export function knexQuery(filters: any, query: PromiseType, columns: ?string): Promise<*> {
  // Do not edit
  const recordQuery = query
    .debug(false) // Handled further down with better logging
    .limit(filters.limit || MAX_LIMIT)
    .offset(filters.offset || 0);

  let count;
  // If the user is fetching a single object by id, return just the record, otherwise return {records, count}
  if (filters.isCollection) {
    count = query
      .clone()
      .first(knex.raw('count(*) AS count')) // overwrite columns with just count
      .limit(1) // overwrite limit with just 1
      .offset(0);

    if (process.env.KNEX_DEBUG) {
      log(chalk.magenta(count.toString()));
      log(chalk.magenta.bold(recordQuery.toString()));
    }

    count = count
      .then(res => get(res, 'count', 0));

    if (filters.sortName) {
      if (filters.sortDir === 'desc') {
        recordQuery.orderByRaw(knex.raw('?? desc NULLS LAST', [filters.sortName]));
      } else {
        recordQuery.orderBy(filters.sortName, filters.sortDir);
      }
    }

    if (columns) {
      recordQuery.columns(columns);
    }

    return Promise.props({records: recordQuery, count})
      .then(result => {
        return {
          records: result.records.map(record => mapKeys(record, (value, key) => camelCase(key))),
          count: result.count,
        };
      });
  }

  if (process.env.KNEX_DEBUG) {
    log(chalk.magenta.bold(recordQuery.toString()));
  }

  if (columns) {
    recordQuery.columns(columns);
  }

  return recordQuery
    .map(record => mapKeys(record, (value, key) => camelCase(key)));

}
