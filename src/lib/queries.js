// @flow
import {map, get} from 'lodash';

import {gql} from '../gql';


export function fetchMany(knex: Function, tableName: string, filters: any) {
  const modifiedFilters = gql.helpers.toSnakeCase(filters);
  return knex(tableName)
    .where(modifiedFilters);
}

export function fetchOne(knex: Function, tableName: string, filters: any) {
  const modifiedFilters = gql.helpers.toSnakeCase(filters);
  return knex(tableName)
    .first('*')
    .where(modifiedFilters)
    .limit(1);
}

/**
 * [create - create one or many records
 *           automatically converts payload into an array of new records
 *           automatically snakecases all keys on all records]
 * @return {Array} Array of new records
 */
export function create(knex: Function, tableName: string, payload: any) {
  if (!Array.isArray(payload)) {
    payload = [payload];
  }

  const modifiedPayload = map(payload, (newRecord) => {
    return gql.helpers.toSnakeCase(newRecord);
  });

  return knex(tableName)
    .insert(modifiedPayload)
    .returning('*');
}

/**
 * [createOne - Calls create Fn but returns the first result]
 */
export function createOne(knex: Function, tableName: string, payload: any) {
  return create(knex, tableName, payload)
    .then(records => get(records, '0'));
}

/**
 * [update - Update one or many records as determined by filters]
 * @param  {Function} knex        tx or knex Fn
 * @param  {String}   tableName   table name exactly as it is in DB
 * @param  {Object}   filters     simple where filters to match on
 * @param  {Object}   payload     only accepts object of keys and values, not an array
 * @return {Array}                returns array of updated records
 */
export function update(knex: Function, tableName: string, filters: any, payload: any) {
  const modifiedFilters = gql.helpers.toSnakeCase(filters);
  const modifiedPayload = gql.helpers.toSnakeCase(payload);

  return knex(tableName)
    .where(modifiedFilters)
    .returning('*')
    .update(modifiedPayload);
}

/**
 * [updateOne - Calls update Fn but returns the first result]
 */
export function updateOne(knex: Function, tableName: string, filters: any, payload: any) {
  return update(knex, tableName, filters, payload)
    .then(records => get(records, '0'));
}
