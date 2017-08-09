// @flow
const _ = require('lodash');
const crypto = require('crypto');

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
  },

  encrypt(plaintext: string): string {
    if (!(process.env.CRYPTO_KEY && process.env.CRYPTO_ALGO)) {
      throw new Error('Missing require environment variables to encrypt data');
    }
    const key = new Buffer(process.env.CRYPTO_KEY, 'hex');
    const cipher = crypto.createCipher(process.env.CRYPTO_ALGO, key);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    return ciphertext;
  },

  decrypt(ciphertext: string): string {
    if (!(process.env.CRYPTO_KEY && process.env.CRYPTO_ALGO)) {
      throw new Error('Missing require environment variables to decrypt data');
    }
    let decrypted: string = '';
    try {
      const key: Buffer = new Buffer(process.env.CRYPTO_KEY, 'hex');
      const decipher = crypto.createDecipher(process.env.CRYPTO_ALGO, key);
      decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } catch (err) {
      decrypted = '';
    }
    return decrypted;
  },
};
