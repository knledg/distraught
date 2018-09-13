// @flow
const _ = require('lodash');
const crypto = require('crypto');
const {URL} = require('url');
const numeral = require('numeral');

const {format} = require('util');

// memory caches
const camelCache = {};
const snakeCache = {};

/**
 * Given a dollar amount, return a formatted price
 * @param {Number} amount
 */
function formatPrice(amount: ?number): string {
  return amount ? numeral(amount).format('$0,000') : '-';
}

/**
 * Given a number, return a formatted number
 * @param {Number} amount
 */
function formatNumber(amount: ?number): string {
  return amount ? numeral(amount).format('0,0') : '-';
}

/**
 * Given a phone number, strip non-numeric characters for database storage
 * Note: If phone has extension, this is not a suitable function
 *
 * @param {Number|String} phone
 * @returns {String}
 */
function sanitizePhone(phone: ?number|string): string {
  let newPhone = String(phone).replace(/\D/g, '');
  if (!newPhone) {
    return '';
  }

  if (String(newPhone)[0] !== '1' && newPhone.length === 10) {
    newPhone = `1${newPhone}`;
  }
  return newPhone;
}

/*
 * Formats a given phone number into a consistent format
 * Note: If phone has extension, this is not a suitable function.
 *
 * Ex:
 * formatPhone('800.123.1234')
 * '(800) 123-1234'
 *
 * @param {String} User passed phone number to format
 * @returns {String} Formatted Number
 */
function formatPhone(phone: ?string): null|string {
  if (!phone) {
    return null;
  }

  let newPhone = String(phone).trim().replace(/\D/g, '');
  let prefix = '';
  if (newPhone.length < 10) {
    return phone; // Phone number is missing digits or otherwise incorrect, return original
  } else if (newPhone.length - 11 >= 1) {
    prefix += '+'; // Allow international phone format
    prefix += format('%s ', newPhone.substr(0, newPhone.length - 10));
    newPhone = newPhone.substr(-10);
  } else if (newPhone.length === 11) {
    newPhone = newPhone.substr(-10);
  }

  return _.spread((coverage, areaCode, part1, part2) => {
    return !newPhone ?
      phone :
      format('%s(%s) %s-%s', prefix, areaCode, part1, part2);
  })(newPhone.match(/^(\d{3})(\d{3})(\d{4})$/));
}

function getUrlParts(origUrl?: string): null|URL {
  if (!origUrl) {
    return null;
  }
  // If there is no protocol, url library throws an error, add protocol if it doesn't exist before parsing URL
  const modifiedUrl = origUrl.indexOf('http') === -1 ? `http://${origUrl}` : origUrl;
  return new URL(modifiedUrl);
}

/**
 * Returns a domain
 * If there is no protocol, default to `http://`
 *
 * @param {String} origUrl
 * @returns {String|null}
 */
function getProtocolAndHostname(origUrl?: string): null|string {
  const url = getUrlParts(origUrl);
  if (!url) {
    return null;
  }
  const port = url.port ? `:${url.port}` : '';
  return `${url.protocol || 'http:'}//${url.hostname}${port}`;
}
/**
 * Returns a domain without a protocol associated with it
 *
 * @param {String} origUrl
 * @returns {String|null}
 */

function getHostname(origUrl?: string): null|string {
  const url = getUrlParts(origUrl);
  if (!url) {
    return null;
  }
  const port = url.port ? `:${url.port}` : '';
  return `${url.hostname}${port}`;
}


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
   * [toSnakeCaseCached - Convert a payload's keys from camelCase to snake_case (Use Memory Cache)]
   * @param  {object} payload
   * @return {object}
   */
  toSnakeCaseCached(payload: Object|Array<Object>): Object {
    if (Array.isArray(payload)) {
      return _.map(payload, (item) => {
        return _.mapKeys(item, (value, key) => {
          return snakeCache[key] ? snakeCache[key] : (snakeCache[key] = _.snakeCase(key));
        });
      });
    }

    return _.mapKeys(payload, (value, key) => {
      return snakeCache[key] ? snakeCache[key] : (snakeCache[key] = _.snakeCase(key));
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

  /**
   * [toCamelCaseCached - Convert a payload's keys from snake_case to camelCase (Use Memory Cache)]
   * @param  {object} payload
   * @return {object}
   */
  toCamelCaseCached(payload: Object|Array<Object>): Object {
    if (Array.isArray(payload)) {
      return _.map(payload, (item) => {
        return _.mapKeys(item, (value, key) => {
          return camelCache[key] ? camelCache[key] : (camelCache[key] = _.camelCase(key));
        });
      });
    }

    return _.mapKeys(payload, (value, key) => {
      return camelCache[key] ? camelCache[key] : (camelCache[key] = _.camelCase(key));
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

  sanitizePhone,
  formatPhone,
  formatPrice,
  formatNumber,
  getProtocolAndHostname,
  getHostname,
};
