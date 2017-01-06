// @flow

import {isFunction, includes, keys} from 'lodash';
import {GraphQLObjectType} from 'graphql';
import graphqlFields from 'graphql-fields';
import crypto from 'crypto';

import {collectionArgs} from './common-fields';
import {knex} from '../lib/knex';
import {knexQuery} from './adapters/knex';
import type {QueryOptsType, CountOptsType} from './adapters/knex';
import {cache} from '../lib/cache';
import {assertEnvironment, assertHasPermission} from './helpers';
import type {AuthUserType} from '../../flow/types/auth-user';


type PGObjectType = {
  name: string, // GQL Object name
  description?: string, // GQL Object description
  columns: any, // GQL Object allowed requestable columns
  filters: any, // GQL Object allowed collection filters
  allowedRoles?: Array<string>,
  allowedEnvironments?: Array<string>,
  resolve: Function, // @todo make more explicit
  cacheTTL?: number, // TTL in ms to cache data, unique hash created based on opts passed to GQL query
};

function executeKnexQuery(filters, queryOpts: QueryOptsType, countOpts: CountOptsType) {
  return knexQuery(filters, queryOpts, countOpts)
    .then(records => {
      if (queryOpts.transform && isFunction(queryOpts.transform)) {
        return queryOpts.transform(records);
      }
      return records;
    });
}

export function pgObject(newPGObject: PGObjectType) {
  if (! newPGObject.name) {
    throw new Error('Invalid pgObject: Name is required');
  } else if (! newPGObject.columns) {
    throw new Error(`Invalid pgObject: Columns is required for ${newPGObject.name}`);
  } else if (! newPGObject.resolve) {
    throw new Error(`Invalid pgObject: Resolve is a required function for ${newPGObject.name}`);
  }

  return new GraphQLObjectType({
    name: newPGObject.name,
    description: newPGObject.description || `No description for ${newPGObject.name}`,
    fields: newPGObject.columns,
    args: collectionArgs(newPGObject.filters || {}),
    resolve(parent: any, filters: any, {user}:{user: AuthUserType}, info: any) {
      if (newPGObject.allowedRoles) {
        assertHasPermission(user, newPGObject.allowedRoles);
      } else if (newPGObject.allowedEnvironments) {
        assertEnvironment(newPGObject.allowedEnvironments);
      }

      const fields = graphqlFields(info);
      const countOpts: CountOptsType = {
        withCount: !!includes(keys(fields), 'count'),
        withCountEstimate: !!includes(keys(fields), 'countEstimate'),
      };

      let knexOpts = newPGObject.resolve(parent, filters, {user, fields}, knex); // Fn resolved to: {query, columns, transform} or query
      if (! (knexOpts && knexOpts.query)) {
        knexOpts = {query: knexOpts, columns: null};
      }

      const queryFn = executeKnexQuery.bind(null, filters, knexOpts, countOpts); // @todo

      if (newPGObject.cacheTTL) {
        const hash = crypto.createHash('md5').update(JSON.stringify({
          fields,
          columns: knexOpts.columns,
          countOpts,
        })).digest('hex'); // takes no more than a few MS

        return cache.getOrSet(`${newPGObject.name.toLowerCase()}-${hash}`, queryFn, newPGObject.cacheTTL);
      }
      return queryFn();
    },
  });
}
