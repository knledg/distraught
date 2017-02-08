// @flow

import {isFunction, includes, keys, get, map, each, filter, without, snakeCase} from 'lodash';
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

type PGOptimizedObjectType = {
  name: string, // GQL Object name
  tableName: string, // Database Table Name
  description?: string, // GQL Object description
  columns: any, // GQL Object allowed requestable columns
  filters: any, // GQL Object allowed collection filters
  allowedRoles?: Array<string>,
  allowedEnvironments?: Array<string>,
  resolve: Function, // @todo make more explicit
  cacheTTL?: number, // TTL in ms to cache data, unique hash created based on opts passed to GQL query
  customColumns?: {
    [key: string]: Function,
  }
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

export function pgOptimizedObject(newPGObject: PGOptimizedObjectType) {
  if (! newPGObject.name) {
    throw new Error('Invalid pgOptimizedObject: Name is required');
  } else if (! newPGObject.columns) {
    throw new Error(`Invalid pgOptimizedObject: Columns is required for ${newPGObject.name}`);
  } else if (! newPGObject.resolve) {
    throw new Error(`Invalid pgOptimizedObject: Resolve is a required function for ${newPGObject.name}`);
  } else if (! newPGObject.tableName) {
    throw new Error(`Invalid pgOptimizedObject: tableName is required for ${newPGObject.name}`);
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
      const excludeColumns = keys(newPGObject.customColumns) || [];
      const fieldSet = filters.isCollection ? fields.records : fields;
      let checkForParentFields = [];
      const columns = map(
        filter(without(keys(fieldSet), ...excludeColumns), (col) => {
          if (get(this.fields(), `${col}.type`) instanceof GraphQLObjectType) {
            checkForParentFields.push(col);
            return false;
          }
          return get(fieldSet, col, false) !== false;
        }),
        (val) => {
          return `${newPGObject.tableName}.${snakeCase(val)}`;
        }
      );
      if (! (knexOpts && knexOpts.query)) {
        knexOpts = {query: knexOpts, columns: columns};
      }
      if (!knexOpts.columns) {
        knexOpts.columns = columns;
      }
      each(checkForParentFields, (col) => {
        const parentFields = get(this.fields(), `${col}.parentFields`, []);
        if (parentFields.length) {
          knexOpts.columns.push(...map(parentFields, (val) => {
            return `${newPGObject.tableName}.${snakeCase(val)}`;
          }));
        }
      });
      each(newPGObject.customColumns, (fn, key) => {
        if (get(fieldSet, key, false)) {
          fn(knexOpts.columns, knexOpts.query, knex);
        }
      });
      knexOpts.columns = Array.from(new Set(knexOpts.columns)); // use unique values only to prevent duplicate fields

      const queryFn = executeKnexQuery.bind(null, filters, knexOpts, countOpts); // @todo

      if (newPGObject.cacheTTL) {
        const hash = crypto.createHash('md5').update(JSON.stringify({
          filters,
          columns: knexOpts.columns,
          countOpts,
        })).digest('hex'); // takes no more than a few MS

        return cache.getOrSet(`${newPGObject.name.toLowerCase()}-${hash}`, queryFn, newPGObject.cacheTTL);
      }
      return queryFn();
    },
  });
}
