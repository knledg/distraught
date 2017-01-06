  /* @flow */
import {camelCase, mapKeys, get} from 'lodash';
import {knex} from '../../lib/knex';
import Promise from 'bluebird';

import type {Promise as PromiseType} from 'bluebird';
export type CountOptsType = {withCount: boolean, withCountEstimate: boolean};
export type QueryOptsType =  {query: PromiseType, columns: ?string, transform?: Function};

const defaultCountOptions = {withCount: false, withCountEstimate: false};

const MAX_LIMIT = 1000;

function fetchCount(query: PromiseType, countOptions: CountOptsType) {
  if (countOptions.withCount) {
    return query
      .first(knex.raw('count(*) AS count')) // overwrite columns with just count
      .limit(1) // overwrite limit with just 1
      .offset(0)
      .then(res => get(res, 'count', 0));
  }
  return Promise.resolve(null);
}

function fetchCountEstimate(query: PromiseType, countOptions: CountOptsType) {
  if (countOptions.withCountEstimate) {
    const clonedQuery = query.toString();
    return knex.raw('select count_estimate(?) AS "countEstimate"', [clonedQuery])
      .then(res => get(res, 'rows.0.countEstimate', 0));
  }
  return Promise.resolve(null);
}

/**
 * [knexQuery - Adapter for Knex SQL Query Builder
 *              Builds and executes queries
 *              Outputs consistent results for a record / collection
 *              Handles defaults]
 * @return {promise}       record|collection {records: [], count}
 */
export function knexQuery(filters: any, queryOpts: QueryOptsType, countOptions: CountOptsType = defaultCountOptions): Promise<*> {
  const query = queryOpts.query;
  // Returns just the record
  if (! filters.isCollection) {
    if (queryOpts.columns) {
      query.columns(queryOpts.columns);
    }

    return query
      .limit(1)
      .offset(0)
      .map(record => mapKeys(record, (value, key) => camelCase(key)));
  }

  // Returns Collection: {records, count, countEstimate}
  const count = fetchCount(query.clone(), countOptions);
  const countEstimate = fetchCountEstimate(query.clone(), countOptions);

  // OrderBy
  if (filters.sortName) {
    if (filters.sortDir === 'desc') {
      query.orderByRaw(knex.raw('?? desc NULLS LAST', [filters.sortName]));
    } else {
      query.orderBy(filters.sortName, filters.sortDir);
    }
  }

  // Columns
  if (queryOpts.columns) {
    query.columns(queryOpts.columns);
  }

  // Limit / Offset
  query
    .limit(filters.limit || MAX_LIMIT)
    .offset(filters.offset || 0);

  return Promise.props({records: query, count, countEstimate})
    .then(result => {
      return {
        records: result.records.map(record => mapKeys(record, (value, key) => camelCase(key))),
        count: result.count,
        countEstimate: result.countEstimate,
      };
    });
}
