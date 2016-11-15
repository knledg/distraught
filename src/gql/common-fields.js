/* @flow */
import {replace, assign, isFunction, cloneDeep} from 'lodash';
import {
  GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLFloat, GraphQLList,
  GraphQLNonNull, GraphQLID, GraphQLEnumType, GraphQLObjectType,
  GraphQLInputObjectType, GraphQLSchema} from 'graphql';
import GQLDate from '@jwdotjs/graphql-custom-datetype';

import {knex} from '../lib/knex';
import {knexQuery} from './adapters/knex';
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
};

type PGMutationType = {
  name: string, // GQL Object name
  description: string, // GQL Object description
  columns: any, // GQL Object allowed requestable columns
  payloadName: string,
  payload: any,
  allowedRoles: ?Array<string>,
  allowedEnvironments?: Array<string>,
  resolve: Function, // @todo make more explicit
};

type GenericType = {
  type: any,
  description: string,
  resolve?: Function,
  required: Function,
  list: Function,
};

type EnumType = {
  type: any,
  description: string,
  resolve?: Function,
  required: Function,
  list: Function,
};

type SchemaObjectType = {
  queries: any,
  mutations: any,
};

const SORT_ENUM = new GraphQLEnumType({
  name: 'SortDirection',
  values: {
    ASC: {value: 'asc'},
    DESC: {value: 'desc'},
  },
});

// Once a GQL object has been defined and has a name, it cannot be redefined, so if we want to reuse a defined object, we need to pull it from the singleton instead of using the `new` keyword.
// Example: Two different files might use `UserStatusEnum.list()` and normally that would throw an error but the singleton will prevent that
const uniqueObjectSingleton = {};

/* Generics */

function buildGeneric(type: any, description: string, resolve: ?Function) {
  let generic: GenericType = {
    type,
    description,
    required() {
      generic.type = new GraphQLNonNull(generic.type);
      return generic;
    },
    list() {
      generic.type = new GraphQLList(generic.type);
      return generic;
    },
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


export function options(enumOpts: {name: string, description: string, resolve?: Function, values: any}) {
  if (! enumOpts.name) {
    throw new Error('Invalid enum: Name is required');
  } else if (! enumOpts.description) {
    throw new Error('Invalid enum: Description is required');
  } else if (! enumOpts.values) {
    throw new Error('Invalid enum: Values are required');
  }

  const gqlEnum: EnumType = {
    type: new GraphQLEnumType({
      name: enumOpts.name,
      values: enumOpts.values,
    }),
    description: enumOpts.description,
    required() {
      const newGqlEnum = cloneDeep(gqlEnum);
      newGqlEnum.type.name += 'Required';

      // Return singleton instance of enum
      const name = newGqlEnum.type.name;
      if (uniqueObjectSingleton[name]) {
        return uniqueObjectSingleton[name];
      }

      newGqlEnum.type = new GraphQLNonNull(newGqlEnum.type);
      uniqueObjectSingleton[name] = newGqlEnum; // Push to singleton


      return newGqlEnum;
    },
    list() {
      const newGqlEnum = cloneDeep(gqlEnum);
      newGqlEnum.type.name += 'List';

      // Return singleton instance of enum
      const name = newGqlEnum.type.name;
      if (uniqueObjectSingleton[name]) {
        return uniqueObjectSingleton[name];
      }

      newGqlEnum.type = new GraphQLList(newGqlEnum.type);
      uniqueObjectSingleton[name] = newGqlEnum; // Push to singleton

      return newGqlEnum;
    },
    getValue(which) {
      if (!gqlEnum.type._enumConfig.values[which]) {
        throw new Error(`Enum "${gqlEnum.type.name}" does not contain a value named "${which}"`);
      }

      return gqlEnum.type._enumConfig.values[which].value;
    },
  };

  if (enumOpts.resolve) {
    gqlEnum.resolve = enumOpts.resolve;
  }

  return gqlEnum;
}

export function pgMutation(newPGMutation: PGMutationType) {
  if (! newPGMutation.name) {
    throw new Error('Invalid pgMutation: Name is required');
  } else if (! newPGMutation.description) {
    throw new Error(`Invalid pgMutation: Description is required for ${newPGMutation.name}`);
  } else if (! newPGMutation.columns) {
    throw new Error(`Invalid pgMutation: Columns are required for ${newPGMutation.name}`);
  } else if (! newPGMutation.payload) {
    throw new Error(`Invalid pgMutation: Payload is required for ${newPGMutation.name}`);
  } else if (! newPGMutation.resolve) {
    throw new Error(`Invalid pgMutation: Resolve is required for ${newPGMutation.name}`);
  } else if (! newPGMutation.hasOwnProperty('allowedRoles')) {
    throw new Error(`Invalid pgMutation: Allowed Roles are required for ${newPGMutation.name} but can null if it is a public mutation.`);
  }

  return {
    type: new GraphQLObjectType({
      name: newPGMutation.name,
      fields: newPGMutation.columns,
      description: newPGMutation.description,
    }),
    args: {
      input: {
        type: new GraphQLInputObjectType({
          name: `${replace(newPGMutation.name, 'Mutation', '')}Input`,
          fields: newPGMutation.payload,
        }),
        description: `Input Validation for ${newPGMutation.name}`,
      },
    },
    resolve: (parent: any, payload: any, {user}:{user: AuthUserType}) => {
      if (newPGMutation.allowedRoles) {
        assertHasPermission(user, newPGMutation.allowedRoles);
      } else if (newPGMutation.allowedEnvironments) {
        assertEnvironment(newPGMutation.allowedEnvironments);
      }
      return newPGMutation.resolve(parent, payload, {user}, knex); // {query, columns, transform} or query
    },
  };
}

type InputObjectType = {
  name: string,
  fields: any,
};

type OutputObjectType = {
  name: string,
  fields: any,
};

/**
 * [inputObject - Used for payload objects in mutations]
 */
export function inputObject(newInputObject: InputObjectType) {
  if (! newInputObject.name) {
    throw new Error('Invalid inputObject, Name is required');
  } else if (! newInputObject.columns) {
    throw new Error(`Invalid inputObject: Columns are required for ${newInputObject.name}`);
  } else if (uniqueObjectSingleton[newInputObject.name]) {
    return uniqueObjectSingleton[newInputObject.name]; // If input object was already defined, return singleton instance
  }

  const type = new GraphQLInputObjectType({
    name: newInputObject.name,
    fields: newInputObject.columns,
  });

  return buildGeneric(type, `input representing: ${newInputObject.name.toLowerCase()}`);
}

/**
 * [outputObject - Used for column objects inside mutations]
 */
export function outputObject(newOutputObject: OutputObjectType) {
  if (! newOutputObject.name) {
    throw new Error('Invalid outputObject, Name is required');
  } else if (! newOutputObject.columns) {
    throw new Error(`Invalid outputObject: Columns are required for ${newOutputObject.name}`);
  } else if (uniqueObjectSingleton[newOutputObject.name]) {
    return uniqueObjectSingleton[newOutputObject.name]; // If input object was already defined, return singleton instance
  }

  const type = new GraphQLObjectType({
    name: newOutputObject.name,
    fields: newOutputObject.columns,
  });

  return buildGeneric(type, `output representing: ${newOutputObject.name.toLowerCase()}`);
}

export function schema(newSchema: SchemaObjectType) {
  if (! newSchema.queries) {
    throw new Error('Invalid schema: Queries are required');
  } else if (! newSchema.mutations) {
    throw new Error('Invalid schema: Mutations are required');
  }

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: () => newSchema.queries,
    }),
    mutation: new GraphQLObjectType({
      name: 'RootMutation',
      fields: () => newSchema.mutations,
    }),
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
    resolve(parent: any, filters: any, {user}:{user: AuthUserType}) {
      if (newPGObject.allowedRoles) {
        assertHasPermission(user, newPGObject.allowedRoles);
      } else if (newPGObject.allowedEnvironments) {
        assertEnvironment(newPGObject.allowedEnvironments);
      }

      let result = newPGObject.resolve(parent, filters, {user}, knex); // {query, columns, transform} or query
      if (! (result && result.query)) {
        result = {query: result, columns: null};
      }
      return knexQuery(filters, result.query, result.columns)
        .then(records => {
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
  return date('the time that this resource was created');
}

export function updatedAt() {
  return date('the time that this resource was edited');
}

export function deletedAt() {
  return date('the time that this resource was deleted');
}

export function limit() {
  return int('Limit the resultset of a collection query');
}

export function id() {
  return {
    type: GraphQLID,
    description: 'Unique ID of the record',
  };
}

export function offset() {
  return int('Offset the resultset of a collection query');
}

export function sortDir() {
  return {
    type: SORT_ENUM,
    description: 'The direction of the sort',
  };
}

export function sortName() {
  return string('The name of the sort');
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
