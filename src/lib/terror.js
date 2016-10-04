/* @flow */
import ES6Error from 'es6-error';

/**
 * TError is a type of error that you can throw where you can include a payload, or metadata
 * regarding the error that occurred so the developers can more easily determine how to fix the
 * error.
 *
 * Example:
 *
 * const userSpecifiedEmail = 'bob@exampleDomain';
 * throw new TError('Invalid email address specified', {email: userSpecifiedEmail});
 */
export class TError extends ES6Error {
  constructor(message: string = '', payload: any) {
    super(message);

    Object.defineProperty(this, '__TErrorPayload', {
      enumerable: true,
      value: payload,
      configurable: false,
      writable: false,
    });
  }
}
