import _ from 'lodash';
import {expect} from 'chai';

import {collectionArgs} from 'src/gql/common-fields';

describe('GraphQL Common Fields', () => {
  it('collectionArgs exist', () => {
    const keys = _.keys(collectionArgs());

    expect(keys).to.contain('id');
    expect(keys).to.contain('limit');
    expect(keys).to.contain('offset');
  });
});
