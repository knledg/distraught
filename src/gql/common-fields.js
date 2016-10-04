/* @flow */
import {GraphQLString, GraphQLInt, GraphQLID, GraphQLEnumType} from 'graphql';
import GraphQLDate from '@jwdotjs/graphql-custom-datetype';

const SORT_ENUM = new GraphQLEnumType({
  name: 'SortDirection',
  values: {
    ASC: {value: 'asc'},
    DESC: {value: 'desc'},
  },
});

export function createdAt() {
  return {
    type: GraphQLDate,
    description:
      'The ISO 8601 date format of the time that this resource was created.',
  };
}

export function updatedAt() {
  return {
    type: GraphQLDate,
    description:
      'The ISO 8601 date format of the time that this resource was edited.',
  };
}

export function deletedAt() {
  return {
    type: GraphQLDate,
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
export function collectionArgs() {
  return {
    id: id(),
    offset: offset(),
    limit: limit(),
  };
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
