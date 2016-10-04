/* @flow */
import {mapKeys, snakeCase, camelCase, some, includes} from 'lodash';
import Boom from 'boom';
import {GraphQLInputObjectType} from 'graphql';

import type AuthUserType from '../../flow/types/auth-user';

type GraphQLObject = {name: string};

function buildInput(prefix: string, graphQLObject: GraphQLObject, fields: any) {
  return {
    input: {
      type: new GraphQLInputObjectType({
        name: `${prefix}${graphQLObject.name}Input`,
        fields,
      }),
      description: `Payload for creating a new ${graphQLObject.name} record`,
    },
  };
}

/**
 * [createInput - Create a GraphQLInputType whose name is always Create<GraphQLObjectName>Input]
 * @param  {object} graphQLObject
 * @param  {object} fields
 * @return {object}
 */
export function createInput(graphQLObject: GraphQLObject, fields: any) {
  return buildInput('Create', graphQLObject, fields);
}

/**
 * [deleteInput - Create a GraphQLInputType whose name is always Delete<GraphQLObjectName>Input]
 * @param  {object} graphQLObject
 * @param  {object} fields
 * @return {object}
 */
export function deleteInput(graphQLObject: GraphQLObject, fields: any) {
  return buildInput('Delete', graphQLObject, fields);
}

/**
 * [updateInput - Create a GraphQLInputType whose name is always Delete<GraphQLObjectName>Input]
 * @param  {object} graphQLObject
 * @param  {object} fields
 * @return {object}
 */
export function updateInput(graphQLObject: GraphQLObject, fields: any) {
  return buildInput('Update', graphQLObject, fields);
}

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
  return some(user.roles, ['name', role]);
}
