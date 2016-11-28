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
