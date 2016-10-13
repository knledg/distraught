/* @flow */
import {assign, isFunction} from 'lodash';
import {
  GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLFloat,
  GraphQLID, GraphQLEnumType, GraphQLObjectType} from 'graphql';
import GQLDate from '@jwdotjs/graphql-custom-datetype';

import {knex} from '../lib/knex';
import {knexQuery} from './adapters/knex';
import {assertEnvironment, assertHasPermission} from './helpers';

import type {AuthUserType} from '../../flow/types/auth-user';

type PGObjectType = {
  name: string, // GQL Object name
  description: string, // GQL Object description
  columns: any, // GQL Object allowed requestable columns
  filters: any, // GQL Object allowed collection filters
  allowedRoles?: Array<string>,
  allowedEnvironments?: Array<string>,
  resolve: Function, // @todo make more explicit
};

type GenericType = {
  type: any,
  description: string,
  resolve?: Function,
};

const SORT_ENUM = new GraphQLEnumType({
  name: 'SortDirection',
  values: {
    ASC: {value: 'asc'},
    DESC: {value: 'desc'},
  },
});

/* Generics */

function buildGeneric(type: any, description: string, resolve: ?Function) {
  let generic: GenericType = {
    type,
    description,
  };

  if (resolve) {
    generic.resolve = resolve;
  }
  return generic;
}

export function date(description: string = '') {
  return buildGeneric(GQLDate, `The ISO 8601 date format of the time representing: ${description.toLowerCase()}`);
}

export function string(description: string = '', resolve: ?Function) {
  return buildGeneric(GraphQLString, description, resolve);
}

export function int(description: string = '', resolve: ?Function) {
  return buildGeneric(GraphQLInt, description, resolve);
}

export function bool(description: string = '', resolve: ?Function) {
  return buildGeneric(GraphQLBoolean, description, resolve);
}

export function float(description: string = '', resolve: ?Function) {
  return buildGeneric(GraphQLFloat, description, resolve);
}

export function pgObject(newPGObject: PGObjectType) {
  if (! newPGObject.name) {
    throw new Error('Invalid pgObject: Name is required');
  } else if (! newPGObject.description) {
    throw new Error('Invalid pgObject: Description is required');
  } else if (! newPGObject.columns) {
    throw new Error('Invalid pgObject: Columns is required');
  } else if (! newPGObject.filters) {
    throw new Error('Invalid pgObject: Filters is required');
  } else if (! newPGObject.resolve) {
    throw new Error('Invalid pgObject: Resolve is required');
  }

  return new GraphQLObjectType({
    name: newPGObject.name,
    description: newPGObject.description,
    fields: newPGObject.columns,
    args: collectionArgs(newPGObject.filters),
    resolve(parent: any, filters: any, {user}:{user: AuthUserType}) {
      debugger;
      if (newPGObject.allowedRoles) {
        assertHasPermission(user, newPGObject.allowedRoles);
      } else if (newPGObject.allowedEnvironments) {
        assertEnvironment(newPGObject.allowedEnvironments);
      }

      let result = newPGObject.resolve(parent, filters, {user}, knex); // {query, columns, postProcessing} or query
      if (! (result && result.query)) {
        result = {query: result, columns: null};
      }
      return knexQuery(filters, result.query, result.columns)
        .then(records => {
          debugger;
          if (result.transform && isFunction(result.transform)) {
            return result.transform(records);
          }
          return records;
        });
    },
  });
}

/* Specifics */

export function createdAt() {
  return {
    type: GQLDate,
    description:
      'The ISO 8601 date format of the time that this resource was created.',
  };
}

export function updatedAt() {
  return {
    type: GQLDate,
    description:
      'The ISO 8601 date format of the time that this resource was edited.',
  };
}

export function deletedAt() {
  return {
    type: GQLDate,
    description:
      'The ISO 8601 date format of the time that this resource was deleted.',
  };
}

export function limit() {
  return {
    type: GraphQLInt,
    description:
      'Limit the resultset of a collection query',
  };
}

export function id() {
  return {
    type: GraphQLID,
    description: 'Unique ID of the record',
  };
}


export function offset() {
  return {
    type: GraphQLInt,
    description:
      'Offset the resultset of a collection query',
  };
}

export function sortDir() {
  return {
    type: SORT_ENUM,
    description: 'The direction of the sort',
  };
}

export function sortName() {
  return {
    type: GraphQLString,
    description: 'The name of the sort',
  };
}

/**
 * [collectionArgs - Default allowed args when searching for a collection of records]
 * @return {object}
 */
export function collectionArgs(additionalArgs: {} = {}) {
  return assign({}, additionalArgs, {
    id: id(),
    offset: offset(),
    limit: limit(),
  });
}


/**
 * [recordArgs - Default allowed args when fetching a single record]
 * @return {object}
 */
export function recordArgs() {
  return {
    id: {
      type: GraphQLID,
    },
  };
}
