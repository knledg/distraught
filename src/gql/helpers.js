/* @flow */
import {mapKeys, snakeCase, camelCase, some, includes} from 'lodash';
import crypto from 'crypto';
import Boom from 'boom';

import type AuthUserType from '../../flow/types/auth-user';

/**
 * [toSnakeCase - Convert a payload's keys from camelCase to snake_case]
 * @param  {object} payload
 * @return {object}
 */
export function toSnakeCase(payload: any) {
  return mapKeys(payload, (value, key) => {
    return snakeCase(key);
  });
}

/**
 * [toCamelCase - Convert a payload's keys from snake_case to camelCase]
 * @param  {object} payload
 * @return {object}
 */
export function toCamelCase(payload: any) {
  return mapKeys(payload, (value, key) => {
    return camelCase(key);
  });
}

export function assertHasPermission(user: {roles: Array<{name: string}>}, allowedRoles: Array<string>) {
  if (! (user && user.roles && user.roles.length)) {
    throw Boom.unauthorized('You are not allowed to perform this action');
  }

  if (! some(user.roles, (role) => includes(allowedRoles, role.name))) {
    throw Boom.unauthorized('You are not allowed to perform this action');
  }
}

export function assertEnvironment(environments: Array<string>) {
  if (! includes(environments, process.env.NODE_ENV)) {
    throw Boom.notImplemented('This feature is not implemented in the current environment.');
  }
}

/**
 * [hasRole - check role existence against a logged in user]
 * @param  {object} user
 * @param  {string} role
 * @return {boolean}
 */
export function hasRole(user:AuthUserType, role: string): boolean {
  if (! (user && user.roles)) {
    return false;
  }

  return some(user.roles, ['name', role]);
}

export function decrypt(ciphertext: string): string {
  if (! (process.env.CRYPTO_KEY && process.env.CRYPTO_ALGO)) {
    throw Boom.badImplementation('Missing require environment variables to encrypt data');
  }

  let decrypted: string = '';
  try {
    const key: Buffer = new Buffer(process.env.CRYPTO_KEY, 'hex');
    const decipher = crypto.createDecipher(process.env.CRYPTO_ALGO, key);
    // $FlowBug crypto$Decipher.update is broken in Flow
    decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    // $FlowBug crypto$Decipher.final is broken in Flow
    decrypted += decipher.final('utf8');
  } catch (err) {
    decrypted = '';
  }
  return decrypted;
}

export function encrypt(plaintext: string): string {
  if (! (process.env.CRYPTO_KEY && process.env.CRYPTO_ALGO)) {
    throw Boom.badImplementation('Missing require environment variables to encrypt data');
  }

  const key = new Buffer(process.env.CRYPTO_KEY, 'hex');
  const cipher = crypto.createCipher(process.env.CRYPTO_ALGO, key);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  return ciphertext;
}
