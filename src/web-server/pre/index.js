/* @flow */
import {includes, map} from 'lodash';
import Boom from 'boom';

export function onlyOnDevelop(request: any, reply: Function) {
  if (process.env.NODE_ENV !== 'development') {
    return reply(Boom.notFound());
  }
  return reply();
}

export const requireJWTAuth =
  process.env.DISABLE_JWT_AUTH === 'true' ? false : 'jwt';

export function requiresRole(requiredRole: string) {
  return function(request: Object, reply: Function) {
    if (includes(map(request.auth.credentials.roles, 'name'), requiredRole)) {
      return reply();
    }
    return reply(Boom.forbidden('You do not have permission to perform this action'));
  };
}

