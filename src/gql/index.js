/* @flow */
import {collection, record, collectionWithFields, recordWithFields} from './builder';
import * as helpers from './helpers';
import {
  bool,
  createdAt,
  date,
  deletedAt,
  float,
  id,
  inputObject,
  int,
  limit,
  offset,
  options, // enum is a reserved word
  outputObject,
  pgMutation,
  schema,
  sortDir,
  sortName,
  string,
  updatedAt,
} from './common-fields';

import {gqlObject} from './gql-object';
import {pgObject} from './pg-object';
import {pgOptimizedObject} from './pg-optimized-object';

export const gql = {
  bool,
  collection,
  collectionWithFields,
  createdAt,
  date,
  deletedAt,
  float,
  gqlObject,
  helpers,
  id,
  inputObject,
  int,
  limit,
  offset,
  options, // enum is a reserved word
  outputObject,
  pgMutation,
  pgObject,
  pgOptimizedObject,
  record,
  recordWithFields,
  schema,
  sortDir,
  sortName,
  string,
  updatedAt,
};
