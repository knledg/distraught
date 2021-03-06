## [v5.0.0]
> September 27, 2019

### Project updates

- update following deps to these versions:

```javascript
{
  "@google-cloud/storage": "^1.7.0",
  "@smartrent/heretic": "^0.5.2",
  "@smartrent/express-status-monitor": "^1.2.7",
  "axios": ">= 0.18.1",
  "body-parser": "^1.19.0",
  "chalk": "^2.4.2",
  "compression": "^1.7.4",
  "cron": "^1.7.2",
  "express": "^4.17.1",
  "glob": "^7.1.4",
  "helmet": "^3.21.1",
  "lodash": ">= 4.17.15",
  "lusca": "^1.6.1",
  "knex": "^0.19.4",
  "morgan": "^1.9.1",
  "@babel/cli": "^7.6.2", 
  "ava": "^2.4.0",
}
```

### Breaking Changes

- Remove support for `express-validator` in favor of using JOI validation

## [v4.5.0]
> October 24th, 2018

### Project updates

- Added Prettier, added Ava for unit tests

### Feature updates

- Add new fn `formatAddress`
- Add new fn `formatCap` (format capitalization)

## [v4.4.0]
> October 9th, 2018

- If REDIS_URL is specified, SocketIO will use Redis instead of in-memory for managing connections. This allows for horizontal scaling of the web process. 

### Minor Breaking Change
- Previously `process.env.enableExpressValidator` would enable the express validator plugin, but this was intended to be `options.enableExpressValidator`. 

## [v4.3.0]
> September 13th, 2018

- Support cached versions of toCamelCase / toSnakeCase for processes that repeat converting the same keys over and over. (more performant)
- Don't reinitialize existing database connections if they were already intialized


## [v4.2.0]
> June 23rd, 2018

- Add `disableDataLogging` to `request` so that the payload is not logged to stdout. This is beneficial for sensitive data or large payloads
- Fix a bug in the worker job logging where a variable was already outputting as "undefined"


## [v4.1.0]
> June 23rd, 2018

- If we can't reach Sentry with a captured exception, write to STDOUT
- Allow engineers to specify `logFormat` in the webserver config to overwrite the default Morgan Logger config that's set

## [v4.0.1]
> May 22st, 2018

- No changes, publishing to try and get 4.0 onto the package regsitry

## [v4.0.0]
> May 21st, 2018

### Breaking Changes

- Remove node-sass-middleware
- Remove Logentries support
- Remove newrelic support. It needs to be required higher in the stack for optimal usage.
- Express Status Monitor is off by default but can be turned on with:

```javascript
Distraught.init({
  enableStatusMonitor: true,
});
```

- Express Validator is off by default but can be turned on with:

```javascript
Distraught.init({
  enableExpressValidator: true,
});
```

- Swagger isn't required by default if `swaggerConfig` isn't specified in the web server start options. To enable use a config similar to below:

```javascript
const server = httpServer({
  swaggerConfig: {
    appRoot: "./",
    yamlPath: path.join(__dirname, "path/to/swagger.yaml"),
    swaggerDocOptions: {
      host: 'yourdomain.com', 
      schemes: process.env.NODE_ENV === "development" ? ["http"] : ["https"],
    },
  },
});
```

- Pug, Twilio, CronJob, and GCS aren't required until the first time those libs are needed.

## [v2.1.0]
> March 16th, 2018

- `request(payload)` now optionally takes `{logErrors: false}` in the payload and prevents default logging

## [v2.0.1]
> March 8th, 2018

- Hotfix for `sendText` function, previously was not working correctly

## [v2.0.0]
> February 27th, 2018

### New functions

#### Email
- `getOverriddenEmail(email)` - take the original email address and format into a dev email while still preserving intended recipient. (e.g. jason@knledg.com -> dev-mailing-list+jason+at+knledg+com@knledg.com)
- `overrideEmail(email)` - if in a guarded environment, return a dev email instead of the original email
- `sendEmail(payload)` - Send an email through Sendgrid

#### Logs

- `logErr(err, extra)` - log an error to Sentry with extra contextual information to help engineers debug. On local env, logs to STDOUT
- `assertKeys(variable, ['key1', 'key.2.value'])` - assertion on deeply nested keys on an object for existence otherwise send errors to Sentry

#### API Requests

- `request(payload)` - make an axios request with additional logging such as payload and response time in milleseconds

#### Sockets

- `createSocketConnection()` establishing a socket connection on an Express server
- `emit()` emits a payload for a particular room

#### Storage

- `getBucket(bucketName)` - fetch a bucket from GCS given the bucket name
- `uploadFile(payload)` - given a file, a bucket, and a path, upload a file to GCS
- `deleteFile()` - given a bucket and path, delete file from GCS
- `streamToBuffer()` - when fetching a file from a stream, load file into memory

#### Templates

- `renderPug(templatePath, pageVars)` - generate html from a pug template

#### Transformations

- `sanitizePhone(phone)` - strip non-numeric characters from a phone number
- `formatPhone(phone)` - format phone as such: `(111) 222-3333`
- `formatPrice(price)` - take a numeric price and format as such `$1,000.00`
- `formatNumber(num)` - take a numeric value and format as such `1,000`
- `getProtocolAndHostname(url)` - return url with protocol, defaults to `http://` if protocol not specified in original value
- `getHostname(url)` - return just the hostname for a url

#### VOIP

- `sendText(payload)` - sends a text message through Twilio

#### Web Handler Wrappers

- `w(asyncHandlerFn)` - wrap a Fn that returns a promise of html, if an uncaught error is thrown, render a generic internal server error while logging as much contextual debug info as possible
- `jw(asyncHandlerFn)` - wrap a Fn that returns a promise of json, if an uncaught error is thrown, render a generic JSON response, but try to read error messsage for usage in displaying common HTTP status error codes

#### Init - Set Initial Config And Fn Executable Before Starting Various Processes

- `init(cfg)` - inits all caching, job queues, database connections, pugOptions, guarded email environments, etc

### Other Changes

- Upgrade flow-bin from `v0.52.0` to `v0.66.0`
- Add Helmet to Express middlewares by default
- Upgrade Express from `v4.15.3` to `v4.16.2`
- Added packages: `pug`, `pretty-error`, `twilio`, `numeral`, `newrelic`
- Remove unused flowtype definition
- Can add swagger "pre" middleware before the docs endpoint is exposed

### Cfg / Env Vars

- `cfg.pathToServerErrorTemplate` - when `w()` captures an uncaught exception, render this generic template
- `cfg.ignoredStackTraceLines` - array of strings where if that string is included in a line of a stack trace, that line is ignored during local development
- `cfg.captureUncaught` - send error to Sentry or STDOUT on local environments when there is an uncaught exception
- `cfg.captureUnhandled` - send error to Sentry or STDOUT on local environments when there is an unhandled rejection
- `cfg.email.guardedEnvironments` - an array of environments where the toEmail(s) will be replaced by a devEmail if in that environment
- `cfg.email.devEmail` - when specified, sends email to that email address instead of the toAddress in guarded environments
- `cfg.enableNewRelic` - enabled newrelic monitoring (also requires ENV var)

- `GOOGLE_CLOUD_AUTH` - base64 encoded auth file to connect to GCP
- `GOOGLE_CLOUD_PROJECT` - specify which project to upload or delete files to/from
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` for sending text messages with Twilio
- `NEW_RELIC_LICENSE_KEY` enabled newrelic monitoring

### Breaking Changes

- Removed functions `enableSQLLogging`, `addDBConnection`, `addCache`, `addHeretic` in favor of `distraught.init(opts)`

## [v0.14.0]
> June 15th, 2017

- Removed Rollbar in favor of Sentry (Raven is npm module)
- Removed Hapi in favor of express
- Removed most transpilation except for transform-flow-strip-types
- Removed GQL logic
- Changed ES6 classes to functions that receive options and return a new instance of that entity (workerServer, cronServer, httpServer, cache)
- Removed ES6 Imports in favor of CommonJS module loading
- Upgraded all outdated deps to the latest version
- Removed Sendgrid logic in favor of Nodemailer, which uses adapters to allow the engineer to choose which email service provider to use
- Add support for Express' Passport authentication.
- Removed use of Bluebird (.finally, .tap, .spread no longer available for use)


## [v0.13.0]
> February 3rd, 2017

- Feature: GQL Errors pass back user object from Hapi's request in the GQL error context, which is passed to Rollbar.

## [v0.12.2]
> February 2nd, 2017

- Bugfix: GraphQL Query Caching Was Not Hashing Filters (it was erroneously hashing fields), causing different queries on the same GQL object to return the same cached value.


## [v0.12.1]
> January 24, 2017

- Feature: Use correct logic check for determining if server-side templating view system should be enabled on Hapi


## [v0.12.0]
> January 15, 2017

- Breaking Change: To enable swagger please pass `swagger: {}` to your WebServer options, otherwise it will be off by default

- Feature: Swagger can now be disabled
- Feature: Swagger options are configurable but fallback to Distraught's previous defaults if none specified
- Feature: Developers can now enable Hapi's server-side rendering via the `this.options.views` params


## [v0.11.1]
> January 12, 2017

- Bugfix: Previously catbox-redis was properly received all options (including host/port)

## [v0.11.0]
> January 6, 2017

- Breaking Change: Swagger can be ran on Prod, requires user to be authenticated, however
- Feature: Upgrade Flow to 0.37.4
- Feature: Created constants `SECOND`, `MINUTE`, `HOUR` (in milleseconds) that can be imported
- Feature: Created `cache` lib which is used by the WebServer, standalone, and with `pgObject`

- Cleaned up WebServer code to be less tangled
- Moved PGObject to its own file from `common-fields`


## [v0.10.0]
> December 23, 2016

- Feature: Implement `countEstimate` for GQL collections and cleanup knex adapter code

## [v0.9.1]
> December 22, 2016

- Feature: Can pause/resume worker queues from the WorkerServer

## [v0.9.0]
> December 21, 2016

- Breaking Change: Distraught explictly ignores HTTP Status Code 422 errors

## [v0.8.2]
> December 19, 2016

- Bugfix: Debug changes from v0.8.1 were incorrectly passing bindings as-is instead of in an array. This fixes knex debugging.

## [v0.8.1]
> December 15, 2016

- Bugfix: user `knex.raw` to escape bound parameters in SQL debug output so they are valid queries

## [v0.8.0]
> November 28, 2016

- Breaking Change: process.env.KNEX_DEBUG will toggle pure SQL output while process.env.KNEX_DEFAULT_DEBUG will toggle output of knex objects (default knex debug behavior)

## [v0.7.2]
> November 30, 2016

- Feature: GQL Enums now have `getKey` Fn for situations where you have the value but need the GQL key

## [v0.7.1]
> November 28, 2016

- Feature: Swagger communicates only on HTTPS on non-development environments

## [v0.7.0]
> November 28, 2016

- Breaking Change: hapi-swagger plugin is enabled on all environments except production

## [v0.6.3]
> November 21, 2016

- Feature: If a user doesn't request a count on a collection, it won't run the count query.
- Exposes fields in `ctx` in the resolve Fn

## [v0.6.2]
> November 17, 2016

- Feature: Redis support for Websockets through Hapi Nes plugin if process.env.REDIS_URL is set
- Feature: WorkerServer uses startCase on queue name in effort to provide better logging for Rollbar

## [v0.6.1]
> November 15, 2016

- Feature: Lock down graphql version to 0.7.* for now
- Feature: Upgrade to latest lodash
- Feature: Better knex logging

## [v0.6.0]
> November 14, 2016

- Feature: Upgrade Flow to 0.35
- Feature: On enums, you can call gqlEnum.getValue(key) to easily retrieve the value from the object
- Feature: Uncaught WebServer errors will show the message, the stack, and a TError Payload if a TError was thrown but never caught (it will warn to use a TError if no TError payload exists)
- Feature: GQL Input Objects, Output Objects, and Enums use a singleton object to return the object if a matching name exists.
- Bugfix: fetch and fetchOne queries were not snake_casing the keys of the filters before applying them

## [v0.5.4]
> November 8, 2016

- Feature: Improved worker rollbar reporting


## [v0.5.3]
> November 8, 2016

- Feature: Modify worker rollbar reporting

## [v0.5.2]
> November 8, 2016

- Feature: Logger that supports logentries, console, and chalk
- Upgrade hapi-graphql to provide additional context around a GQL error
- Rollbar errors supported for failed worker jobs and GQL errors


## [v0.5.1]
> November 7, 2016

- Feature: Upgrade hapi-graphql to fix a bug where sometimes error.output wasn't defined which caused a runtime error
- Upgrade WorkerServer to accept alertAt, killAt, onKilled, and debug options

## [v0.5.0]
> November 3, 2016

### Breaking Changes:
- Don't store Heretic outcomes in RabbitMQ

## [v0.4.1]
> November 2, 2016

- Feature: GQL Input/Output Objects now have functionality from buildGeneric() (ability to chain the `list()` or `required()` commands)
- Feature: Knex Helper Queries: fetchOne, fetchMany, create, createOne, update, updateOne

## [v0.4.0]
> October 28, 2016

- Feature: Added support for non-null, lists and enum
- Feature: Created functions for inputObject/outputObject in GQL
- Feature: Create pgMutation function
- Feature: Created function for creating a GQL schema

- Bugfix: If using GQL plugin but DisableJWTAuth was true, the server would fail with a non-descript error


### Breaking Changes:
- Moved all the GQL types to the root `gql` object
- Removed the GQL input helpers in favor of `pgMutation`
- No longer export knexQuery, which was a helper function for GQL queries/mutations
- collectionArgs and recordArgs are no longer exported, they are used internally

## [v0.3.1]
> October 17, 2016

- Bugfix: Re-add Hapi's vision as a plugin, we can use the version that comes with Hapi.

## [v0.3.0]
> October 17, 2016

- Feature: Upgrade knex to ^0.12.5
- Feature: Add CronServer
- Feature: Add WorkerServer
- Feature: Better use of Chalk for complex console messages
- Feature: Added GraphQL PGObjectType to simplify GraphQL Object definitions
- Feature: Added GraphQL type methods for string, int, float, bool that all take descriptions as arg
- Feature: Added encrypt/decrypt functions to helpers
- Feature: Export Boom

- Bugfix: Path for error-handler in rollbar was wrong

### Breaking Changes
- Requires CRYPTO_ALGO and CRYPTO_KEY in .env
- Remove filter email from sgHelper.Email
- Remove Hapi's Vision library as an installed dep and plugin.
- knexQuery now takes `(filters, query, columns)` as args
- collectionArgs now takes additionalArgs as an arg and then returns an _.assign


## [v0.2.2]
> October 12, 2016

- Feature: Update Node engine to support >= 6.6.0

## [v0.2.1]
> October 11, 2016

- Bugfix: TError was not exported correctly


## [v0.2.0]
> October 11, 2016

- Bugfix: Error Reporting


## [v0.1.0]
> October 11, 2016

- Initial Release, does not include CronServer or WorkerServer
