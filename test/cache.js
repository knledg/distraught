import {expect} from 'chai';
import Promise from 'bluebird';

import {cache} from 'src/lib/cache';

describe('Cache', () => {
  it('getValueIfFunc returns a number', () => {
    return cache.getValueIfFunc(1)
      .then((result) => {
        expect(result).to.equal(1);
      });
  });

  it('getValueIfFunc returns a string', () => {
    return cache.getValueIfFunc('string')
      .then((result) => {
        expect(result).to.equal('string');
      });
  });

  it('getValueIfFunc returns a bool', () => {
    return cache.getValueIfFunc(false)
      .then((result) => {
        expect(result).to.equal(false);
      });
  });

  it('getValueIfFunc returns a result of a function', () => {
    const sum = function(a, b) {
      return a + b;
    };

    return cache.getValueIfFunc(sum.bind(null, 1, 2))
      .then((result) => {
        expect(result).to.equal(3);
      });
  });

  it('getValueIfFunc returns a result of two nested functions', () => {
    const sum = function(a, b) {
      const actuallySum = function(c, d) {
        return c + d;
      };
      return actuallySum.bind(null, a, b);
    };

    return cache.getValueIfFunc(sum.bind(null, 1, 2))
      .then((result) => {
        expect(result).to.equal(3);
      });
  });

  it('getValueIfFunc returns a result of a Promise', () => {
    const funcReturningPromise = function() {
      return Promise.delay(300).then(() => 'complete');
    };

    return cache.getValueIfFunc(funcReturningPromise)
      .then((result) => {
        expect(result).to.equal('complete');
      });
  });
});
