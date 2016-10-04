import {expect} from 'chai';
import {gql} from 'src/gql';

describe('GraphQL Mutation Helpers', () => {
  it('assertEnvironment correctly handles environment checks', () => {

    const FEATURE_NOT_IMPLEMENTED_ERROR = 'This feature is not implemented in the current environment.'; // drop 'Error: ' from the string

    // Testing .to.throw requires passing a function that has params bound
    expect(gql.helpers.assertEnvironment.bind(null, ['qa', 'staging', 'production'])).to.throw(FEATURE_NOT_IMPLEMENTED_ERROR);
    expect(gql.helpers.assertEnvironment(['test'])).to.be.undefined;
  });
});
