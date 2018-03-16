// @flow
const _ = require('lodash');
const axios = require('axios');
const chalk = require('chalk');

const {log, logErr} = require('./logger');

type AxiosRequest = {|
  url: string,
  method: 'GET'|'POST'|'DELETE'|'PUT',
  data?: Object,
  debug?: any,
  logErrors?: boolean,
|};

/**
 * Given a payload, make an axios request with additional logging around success/error responses including execution time on the request
 * @param {Object} payload
 */
function request(payload: AxiosRequest): Promise<any> {
  const startTime = Date.now();
  return axios(payload)
    .then((response) => {
      log(chalk.blue(payload.method.toUpperCase()), chalk.white(payload.url), chalk.cyan(response.status), chalk.green(`${Date.now() - startTime}ms`));
      if (payload.method.toUpperCase() === 'POST' && payload.data) {
        log(payload.data);
      }
      return response.data;
    })
    .catch((err) => {
      if (!payload.hasOwnProperty('logErrors') || payload.logErrors) {
        const message = _.get(err, 'response.data.message', err.message);
        logErr(new Error(message), {url: payload.url, debug: payload.debug, data: payload.data || '', ms: `${Date.now() - startTime}ms`});
      }

      throw err;
    });
}

module.exports = {request};
