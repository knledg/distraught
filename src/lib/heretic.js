// @flow
const Heretic = require("@smartrent/heretic");

type OptionsType = {
  connection: string,
  db: string,
  applicationName?: string,
};

module.exports = {
  addHeretic(name: string, options: OptionsType, heretic: Object, db: Object) {
    heretic[name] = new Heretic(options.connection, db[options.db], {
      socketOptions: {
        clientProperties: {
          Application: options.applicationName || "Workers",
        },
      },
      writeOutcomes: false,
    });
  },
};
