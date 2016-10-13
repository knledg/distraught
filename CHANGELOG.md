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
