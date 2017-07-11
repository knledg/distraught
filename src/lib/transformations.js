// @flow
const _ = require ('lodash');

module.exports = {
  /**
   * [toSnakeCase - Convert a payload's keys from camelCase to snake_case]
   * @param  {object} payload
   * @return {object}
   */
  toSnakeCase(payload: Object|Array<Object>): Object {
    if (Array.isArray(payload)) {
      return _.map(payload, (item) => {
        return _.mapKeys(item, (value, key) => {
          return _.snakeCase(key);
        });
      });
    }

    return _.mapKeys(payload, (value, key) => {
      return _.snakeCase(key);
    });
  },

  /**
   * [toCamelCase - Convert a payload's keys from snake_case to camelCase]
   * @param  {object} payload
   * @return {object}
   */
  toCamelCase(payload: Object|Array<Object>): Object {
    if (Array.isArray(payload)) {
      return _.map(payload, (item) => {
        return _.mapKeys(item, (value, key) => {
          return _.camelCase(key);
        });
      });
    }

    return _.mapKeys(payload, (value, key) => {
      return _.camelCase(key);
    });
  }
};
