/* @flow */
declare var process: { // eslint-disable-line
  env: {
    AMQP_URL?: string,
    APP_NAME: string,
    DATABASE_URL: string,
    REDIS_URL?: string,
    REDIS_PREFIX?: string,
    DEBUG_CACHE?: string,
    DYNO: string,
    GIT_SHA: string,
    HOST: string,
    KNEX_DEBUG: ?string,
    KNEX_DEFAULT_DEBUG: ?string,
    NODE_ENV: string,
    PORT: string,

    NEW_RELIC_LICENSE_KEY?: string,

    LOGENTRIES_TOKEN?: string,

    SENTRY_DSN?: string,

    SENDGRID_API_KEY?: string,

    SLACK_WEBHOOK_URL: string,

    GOOGLE_CLOUD_AUTH: string,
    GOOGLE_CLOUD_PROJECT: string,

    CRYPTO_KEY?: string,
    CRYPTO_ALGO?: string,

    FACEBOOK_OAUTH_ID: string,
    FACEBOOK_OAUTH_SECRET: string,

    GOOGLE_OAUTH_ID: string,
    GOOGLE_OAUTH_SECRET: string,

    TWILIO_ACCOUNT_SID?: string,
    TWILIO_AUTH_TOKEN?: string,

    SESSION_SECRET: string,

    SENTRY_DSN?: string,
  },
  cwd: Function,
  on: Function,
  exit: Function,
};
