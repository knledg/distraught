// @flow

const _ = require('lodash');
const {toSnakeCase, toCamelCase} = require('./transformations');

/**
 * [create - create one or many records
 *           automatically converts payload into an array of new records
 *           automatically snakecases all keys on all records]
 * @return {Array} Array of new records
 */
const create = function create(knex: Function, tableName: string, payload: any) {
  if (!Array.isArray(payload)) {
    payload = [payload];
  }

  const modifiedPayload = _.map(payload, (newRecord) => {
    return toSnakeCase(newRecord);
  });

  return knex(tableName)
    .insert(modifiedPayload)
    .returning('*');
};

/**
 * [update - Update one or many records as determined by filters]
 * @param  {Function} knex        tx or knex Fn
 * @param  {String}   tableName   table name exactly as it is in DB
 * @param  {Object}   filters     simple where filters to match on
 * @param  {Object}   payload     only accepts object of keys and values, not an array
 * @return {Array}                returns array of updated records
 */
const update = function update(knex: Function, tableName: string, filters: any, payload: any) {
  const modifiedFilters = toSnakeCase(filters);
  const modifiedPayload = toSnakeCase(payload);

  return knex(tableName)
    .where(modifiedFilters)
    .returning('*')
    .update(modifiedPayload);
};

module.exports = {

  fetchMany(knex: Function, tableName: string, filters: any) {
    const modifiedFilters = toSnakeCase(filters);
    return knex(tableName)
      .where(modifiedFilters);
  },

  fetchOne(knex: Function, tableName: string, filters: any) {
    const modifiedFilters = toSnakeCase(filters);
    return knex(tableName)
      .first('*')
      .where(modifiedFilters)
      .limit(1);
  },

  create,

  /**
   * [createOne - Calls create Fn but returns the first result]
   */
  createOne(knex: Function, tableName: string, payload: any) {
    return create(knex, tableName, payload)
      .then(records => _.get(records, '0'));
  },

  update,

  /**
   * [updateOne - Calls update Fn but returns the first result]
   */
  updateOne(knex: Function, tableName: string, filters: any, payload: any) {
    return update(knex, tableName, filters, payload)
      .then(records => _.get(records, '0'));
  },
};
