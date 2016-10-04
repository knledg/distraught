/* @flow */
import {collection, record} from './builder';
import {knexQuery} from './adapters/knex';
import * as types from './common-fields';
import * as helpers from './helpers';

export const gql = {
  collection,
  record,
  knexQuery,
  types,
  helpers,
};
