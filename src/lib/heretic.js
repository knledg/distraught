// @flow
const Heretic = require('heretic');

type OptionsType = {
  connection: string,
  dbConnection: Function,
  applicationName?: string,
};

const heretic = {};
module.exports = {
  heretic,
  addHeretic(namespace: string, options: OptionsType) {
    const newHeretic = new Heretic(options.connection, options.dbConnection, {
      socketOptions: {
        clientProperties: {
          Application: options.applicationName || 'Workers',
        },
      },
      writeOutcomes: false,
    });

    heretic[namespace] = newHeretic;
  },
};
