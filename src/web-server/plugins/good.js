/* @flow */

type EventType = {ops?: string, log: string, response: string, error: string, request: string};

export default function(server: {register: Function}): Function {
  let events: EventType = {
    log: '*',
    response: '*',
    error: '*',
    request: '*',
  };

  let reporters = [{
    reporter: require('good-console'),
    events,
  }];

  if (process.env.LOGENTRIES_TOKEN) {
    reporters.push({
      reporter: require('good-logentries'),
      events,
      config: {
        token: process.env.LOGENTRIES_TOKEN,
      },
    });
  }

  return server.register({
    register: require('good'),
    options: {
      opsInterval: 30000,
      reporters: reporters,
      requestHeaders: true,
      requestPayload: true,
      filter: {
        password: 'remove',
        token: 'remove',
      },
    },
  }, function(err) {
    if (err) {
      throw err;
    }
  });
}
