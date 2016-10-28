/* @flow */
import {collection, record} from './builder';
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
  pgObject,
  schema,
  sortDir,
  sortName,
  string,
  updatedAt,
} from './common-fields';

export const gql = {
  bool,
  collection,
  createdAt,
  date,
  deletedAt,
  float,
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
  record,
  schema,
  sortDir,
  sortName,
  string,
  updatedAt,
};
