  /* @flow */
import {camelCase, mapKeys} from 'lodash';
import {knex} from '../../lib/knex';
import Promise from 'bluebird';

const MAX_LIMIT = 1000;

/**
 * [knexQuery - Adapter for Knex SQL Query Builder
 *              Builds and executes queries
 *              Outputs consistent results for a record / collection
 *              Handles defaults]
 * @param  {null|object}   parent  optional parent object
 * @param  {object}        filters user-specified filters
 * @param  {function} cb   cb to handle the user-specified filters
 * @return {promise}       record|collection {records: [], count}
 */
export function knexQuery(parent: ?any, filters: any, cb: Function, columns: ?string): Promise<*> {
  let query = cb(knex);

  // Do not edit
  const recordQuery = query
    .debug(process.env.KNEX_DEBUG)
    .limit(filters.limit || MAX_LIMIT)
    .offset(filters.offset || 0);

  let count;
  // If the user is fetching a single object by id, return just the record, otherwise return {records, count}
  if (filters.isCollection) {
    count = query
      .clone()
      .first(knex.raw('count(*) AS count')) // overwrite columns with just count
      .limit(1) // overwrite limit with just 1
      .offset(0)
      .debug(process.env.KNEX_DEBUG)
      .then(res => res.count);

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


  return recordQuery
    .map(record => mapKeys(record, (value, key) => camelCase(key)));

}
