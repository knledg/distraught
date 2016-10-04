/* @flow */
import Boom from 'boom';

export function onlyOnDevelop(request: any, reply: Function) {
  if (process.env.NODE_ENV !== 'development') {
    return reply(Boom.notFound());
  }
  return reply();
}
