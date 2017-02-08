// @flow
import {GraphQLObjectType} from 'graphql';
import graphqlFields from 'graphql-fields';

import {collectionArgs} from './common-fields';
import {cache} from '../lib/cache';
import {assertEnvironment, assertHasPermission} from './helpers';
import type {AuthUserType} from '../../flow/types/auth-user';


type gqlObjectType = {
  name: string, // GQL Object name
  description?: string, // GQL Object description
  columns: any, // GQL Object allowed requestable columns
  filters: any, // GQL Object allowed collection filters
  allowedRoles?: Array<string>,
  allowedEnvironments?: Array<string>,
  resolve: Function, // @todo make more explicit
  cacheTTL?: number, // TTL in ms to cache data, unique hash created based on opts passed to GQL query
};

export function gqlObject(newObject: gqlObjectType) {
  if (! newObject.name) {
    throw new Error('Invalid gqlObject: Name is required');
  } else if (! newObject.columns) {
    throw new Error(`Invalid gqlObject: Columns is required for ${newObject.name}`);
  } else if (! newObject.resolve) {
    throw new Error(`Invalid gqlObject: Resolve is a required function for ${newObject.name}`);
  }

  return new GraphQLObjectType({
    name: newObject.name,
    description: newObject.description || `No description for ${newObject.name}`,
    fields: newObject.columns,
    args: collectionArgs(newObject.filters || {}),
    resolve(parent: any, filters: any, {user}:{user: AuthUserType}, info: any) {
      if (!(parent && parent.records)) {
        parent = {records: parent};
      }
      if (newObject.allowedRoles) {
        assertHasPermission(user, newObject.allowedRoles);
      } else if (newObject.allowedEnvironments) {
        assertEnvironment(newObject.allowedEnvironments);
      }
      const fields = graphqlFields(info);
      let result = newObject.resolve(parent, filters, {user, fields});
      if (newObject.cacheTTL && parent.cacheKey) {
        return cache.getOrSet(`${newObject.name.toLowerCase()}-${parent.cacheKey}`, () => [result], newObject.cacheTTL);
      }
      return Promise.resolve([result]);
    },
  });
}
