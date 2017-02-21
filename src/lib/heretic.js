// @flow

import Heretic from 'heretic';
export const heretic = {};

type OptionsType = {
  amqpURL: string,
  dbConnection: Function,
  applicationName?: string,
};

export function addHeretic(namespace: string, options: OptionsType) {
  const newHeretic = new Heretic(options.amqpURL, options.dbConnection, {
    socketOptions: {
      clientProperties: {
        Application: options.applicationName || 'Workers',
      },
    },
    writeOutcomes: false,
  });

  heretic[namespace] = newHeretic;
}

