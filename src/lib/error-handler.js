/* @flow */
import {includes, isString, assign, noop} from 'lodash';
import {GraphQLError} from 'graphql';
import rollbar from 'rollbar';
import {TError} from './terror';

type TagType = {connection: string, client: string};

/* eslint-disable max-statements */
class ErrorHandler {

  static IGNORED_ERRORS: Array<string>

  // Patch the raw request to work with rollbar's assumptions (which are based on express)
  rollbarRequest(request: any) {
    if (! request) {
      return null;
    }

    let req = request.raw.req;

    req.socket = {
      encrypted: request.server.info.protocol === 'https',
    };

    req.connection = {
      remoteAddress: request.info.remoteAddress,
    };

    return req;
  }

  /**
   * [hapiError - comes from server.on('log') with the tag error ]
   * @param  {object} error
   * @param  {object} tags
   */
  hapiError(error: Error|string, tags?: TagType) {
    if (error instanceof TError) {
      return this.terror(error, {tags});
    } else if (error instanceof Error) {
      if (tags && tags.connection && tags.client && includes(this.constructor.IGNORED_ERRORS, error)) {
        return null;
      }

      return rollbar.handleErrorWithPayloadData(error, {custom: {tags}, level: 'error'});
    } else if (isString(error)) {
      return rollbar.reportMessageWithPayloadData(error, {level: 'error', custom: {tags}});
    }

    return rollbar.handleErrorWithPayloadData('Unknown error', {custom: {error, tags}});
  }

  /**
   * [hapiError - comes from server.on('request')]
   * @param  {object} error
   * @param  {object} tags
   */
  hapiRequest(request: any, error: GraphQLError|Error|string, tags?: TagType) {
    if (error instanceof TError) {
      return this.terrorWithRequest(error, request);
    } else if (error instanceof Error || error instanceof GraphQLError) {
      return rollbar.handleError(error, this.rollbarRequest(request));
    } else if (isString(error)) {
      return rollbar.reportMessage(error, 'error', this.rollbarRequest(request));
    }

    return rollbar.handleErrorWithPayloadData('Unknown error', {custom: {error, tags}});
  }

  /**
   * [hapiPreResponse - comes from server.ext('onPreResponse')]
   * @param  {object} request
   */
  hapiPreResponse(request: any) {
    const response = request.response;
    if (response instanceof TError) {
      return this.terrorWithRequest(response, request);
    }

    let statusCode = response.output && response.output.statusCode;
    if (! statusCode && response.request && response.request.response) {
      statusCode = response.request.response.statusCode; // seems that favicon is returned through this
    }

    switch (statusCode) {
      case 200:
      case 201:
      case 202:
      case 204:
      case 301:
      case 302:
      case 304:
      case 422:
        return null; // statusCodes we don't want to log
      case 400:
        return this.generateInstanceOfError(request, response, 'warning');
      case 401:
      case 403:
        return this.generateInstanceOfError(request, response, 'info');
      case 404:
        let err = new Error();
        err.name = `Route not found: ${request.url.path}`;
        err.message = request.path;
        return rollbar.handleErrorWithPayloadData(err, {level: 'warning'}, this.rollbarRequest(request));
      default:
        return this.generateInstanceOfError(request, response);
    }
  }

  generateInstanceOfError(request: any, response: Error|{data: {name: string, stack: any, details: Array<string>}}, level: string = 'error') {
    let err;

    if (response instanceof Error) {
      // when an Error is simply thrown and caught by nodeify
      err = response;
    } else if (! response.data) {
      return null; // Not enough information to generate error
    } else {
      // Hapi caught a tag that had "error" in it
      err = new Error();
      err.name = response.data && response.data.name;
      err.message = request.path;
      err.stack = response.data && response.data.stack;
    }

    let details;
    if (response.data && response.data.details) {
      if (Array.isArray(response.data.details) && response.data.details.length === 1) {
        details = response.data.details[0];
      } else {
        details = response.data.details;
      }
    }

    const payload = {
      details,
      level,
      payload: request.payload,
      params: request.params,
    };

    if (err.message && includes(this.constructor.IGNORED_ERRORS, err.message.replace('Uncaught error: ', ''))) {
      return null;
    }
    return rollbar.handleErrorWithPayloadData(err, payload, this.rollbarRequest(request));
  }

  /**
   * [terror - instanceof TError ]
   * @param  {object} terror  TError
   * @param  {object} request
   */
  terrorWithRequest(terror: {__TErrorPayload: any}, request: any) {
    return rollbar.handleErrorWithPayloadData(
      terror,
      {level: 'error', custom: terror.__TErrorPayload},
      this.rollbarRequest(request)
    );
  }

  /**
   * [terror - instanceof TError ]
   * @param  {object} terror  TError
   * @param  {object} additionalPayload
   */
  terror(terror: Error, additionalPayload: any = {}) {
    return rollbar.handleErrorWithPayloadData(
      terror,
      {level: 'error', custom: assign({}, terror.__TErrorPayload || {}, additionalPayload)}
    );
  }

  /**
   * [error - error and callback ]
   * @param  {object}   err
   * @param  {Function} cb
   */
  error(err: {__TErrorPayload: any}|Error|string, cb: Function = noop) {
    if (err instanceof TError) {
      const payload = {level: 'error', custom: err.__TErrorPayload};
      return rollbar.handleErrorWithPayloadData(err, payload, cb);
    } else if (err instanceof Error) {
      return rollbar.handleError(err, cb);
    }

    rollbar.reportMessage(err, 'error');
    return cb();
  }

  logToTerminal(message: string, obj: any) {
    /* eslint-disable no-console */
    console.error(message, obj);
    /* eslint-enable no-console */
  }
}
/* eslint-enable max-statements */

ErrorHandler.IGNORED_ERRORS = [ 'ECONNRESET', 'write after end', 'socket hang up' ];


export const errorHandler = new ErrorHandler();
