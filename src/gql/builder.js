/* @flow */
import {assign, get} from 'lodash';
import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
} from 'graphql';

import {recordArgs} from './common-fields';

// Don't create the same collection more than once
const collections = {};

type GraphQLObjectInstanceType = {
  name: string,
  description: string,
  _typeConfig: {args: any, resolve: Function, fields: Function}
};

/**
 * [collection - specify a custom GraphQLObjectType, build a GraphQLList]
 * @param  {object} graphQLObject           - instance of GraphQLObjectType
 * @param  {func}   injectFiltersFromParent - if the parent requires additional filters
 *                                            to be applied to fetch a specific child record
 *                                            specify it here
 * @param  {object} parentGraphQLObject     - optional parent object to namespace a parent/child collection type
 * @return {object} graphQLList             - GraphQLOutputType {records: [], count: x}
 */
export function collection(graphQLObject: GraphQLObjectInstanceType, injectFiltersFromParent?: Function, parentGraphQLObject?: ?any, prefix: string = '') {
  const name = (parentGraphQLObject ? parentGraphQLObject.name : '') +
        prefix + graphQLObject.name + 'Collection';

  if (!collections[name]) {
    collections[name] = {
      type: new GraphQLObjectType({
        name,
        description: `A collection of ${graphQLObject.name} records`,
        fields: () => ({
          count: {
            type: GraphQLInt,
            description: 'Count of all records that match user-specified filters',
          },
          countEstimate: {
            type: GraphQLInt,
            description: 'Count estimate of all records that match user-specified filters',
          },
          records: {
            type: new GraphQLList(graphQLObject),
            description: 'A list of records matching the user-specified filters',
          },
        }),
      }),
      args: graphQLObject._typeConfig.args, // must return an object
      resolve: (parent: ?any, filters: any, context: any, info: any) => {
        filters.isCollection = true; // inject isCollection so we know how to return the result from knex adapter

        if (typeof injectFiltersFromParent === 'function') {
          filters = injectFiltersFromParent(parent, filters, context, info);
        }
        return graphQLObject._typeConfig.resolve(parent, filters, context, info);
      },
    };
  }

  return collections[name];
}

/**
 * [record - specify a custom GraphQLObjectType, build a fetchable record]
 * @param  {object} graphQLObject           - instance of GraphQLObjectType
 * @param  {func}   injectFiltersFromParent - if the parent requires additional filters
 *                                            to be applied to fetch a specific child record
 *                                            specify it here
 * @return {object}                         - GraphQLOutputType (defined by /types/<file>.js)
 */
export function record(graphQLObject: GraphQLObjectInstanceType, injectFiltersFromParent?: Function) {
  return {
    type: graphQLObject,
    args: recordArgs(), // must return an object
    resolve: (parent: ?any, filters: any, context: any, info: any) => {
      if (typeof injectFiltersFromParent === 'function') {
        filters = injectFiltersFromParent(parent, filters, context, info);
      }

      return graphQLObject._typeConfig.resolve(parent, filters, context, info)
        .then(records => get(records, '0'));
    },
  };
}
