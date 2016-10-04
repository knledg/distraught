import _ from 'lodash';
import {expect} from 'chai';

import {gql} from 'src/gql';

// We don't have any server tests, remove this when we do
describe('GraphQL Common Fields', () => {
  it('collectionArgs exist', () => {
    const keys = _.keys(gql.types.collectionArgs());

    expect(keys).to.contain('id');
    expect(keys).to.contain('limit');
    expect(keys).to.contain('offset');
  });
});
