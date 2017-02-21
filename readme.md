# Distraught Web Server

> I was distraught!!



@Todo update documentation for db/worker-server/graphql

Distraught is a wrapper around a Node.js Hapi server that exposes an HTTPServer for web requests, a CronServer for functions that need to be called at set intervals, and a WorkerServer to handle long requests.

This does require some migrations to be ran, however this server does -not- run the migrations on startup. If you are using Distraught for the first time, please run the following migration:

```sql
CREATE TABLE heretic_jobs (
  id SERIAL NOT NULL PRIMARY KEY,
  queue_name text NOT NULL,
  status text DEFAULT 'pending',
  payload jsonb,
  attempt_logs jsonb[] DEFAULT '{}',
  max_attempts int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_attempted_at timestamptz
);

CREATE INDEX ON heretic_jobs (queue_name);
CREATE INDEX ON heretic_jobs (status);

CREATE FUNCTION heretic_updated_at_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_heretic_jobs_updated_at
  BEFORE UPDATE ON heretic_jobs
  FOR EACH ROW EXECUTE PROCEDURE heretic_updated_at_timestamp();
```



## Todo

- [ ] Webpack Dev-Server
- [x] Implement workers / crons

## Interface
- Utilizes a [Swagger](http://swagger.io/) interface to easily test all HTTP endpoints. Swagger self-documents your HTTP endpoints to make it easy for your frontend developers to access data. [Localhost Swagger](http://localhost:8009/)
- Structured to easily support versioning of endpoints

## GraphQL w/ GraphiQL
- Implements a GraphQL endpoint to fetch/search your records/collections [Localhost Graphql](http://localhost:8009/graphql)

## Collection Count Estimate

To use a countEstimate for your collections to speed up performance, please view [these instructions](https://wiki.postgresql.org/wiki/Count_estimate) on how to add the `count_estimate` function to your Postgres server

### Authorization

The resolve function in mutations and queries receive an object as the third param of `context` which currently has a single key of `user` which is the authenticated user.  This can be used to make sure the current user has permission to do whatever action is being taken, either a mutation or just fetching data.

For example in a type:
```javascript
resolve: (parent, filters, {user}) => gql.knexQuery(parent, filters, (knex) => {
  gql.helpers.assertHasPermission(user, ['admin']);

  ...
```

or in a mutation:
```javascript
resolve: (parent, payload, {user}) => {
  gql.helpers.assertHasPermission(user, ['admin', 'call-center']);

  ...
```

The `assertHasPermission` funciton can be imported from 'server/graphql/mutations/helpers'

### Mutations in GraphiQL

In the query section:
```javascript
mutation callThisAnyAliasYouWant($input_whateverWeWant:CreateUserRoleInput){
  createUserRole(input:$input_whateverWeWant) {
    userId
    roleId
    createdAt
  }
}
```

In the variable section:
```javascript
{
  "input_whateverWeWant": {
    "userId": 1,
    "roleId": 5
  }
}
```

## Validation
- Utilizes [Joi Validation](https://github.com/hapijs/joi/blob/v9.0.0-2/API.md) to easily test that the users' payloads are what you expect them to be.

## Processes

The framework is setup to run three processes: web, crons, and workers.

- Web
  - Will boot up the Hapi server and Swagger interface
- Crons
  - These are processes that run in the background at set intervals
- Workers
  - Workers are background processes that may take quite a bit of time to complete, so they are enqueued to a RabbitMQ server via [Heretic, a simple RabbitMQ interface](https://github.com/bjyoungblood/heretic)

## Logging

- Supports sending all server logs to [Logentries](https://logentries.com/) if a LOGENTRIES_TOKEN is present.
- Supports sending uncaught/unhandled errors to [Rollbar](https://rollbar.com) if a ROLLBAR_TOKEN is present.

## Database

- Utilizes [Knex](http://knexjs.org/) to handle your queries

## Setting Up A HTTPServer

```javascript

import {HTTPServer} from 'distraught';

// These need to be defined before instantiating a new webserver
HTTPServer.setPres({
  verifyRole(request, reply) {
    if (! includes(request.auth.credentials.roles, 'superGlobalAdmin') {
      throw Boom.unauthorized('Not super global admin');
    }

    return reply();
  }
});


export const server = new HTTPServer({
  routes: HTTPServer.loadRoutesFromPath(path.join(__dirname, 'routes')),
  requiredEnv: ['3RD_PARTY_TOKEN', 'SOME_API_KEY'],
  setAuthStrategies: hapi => {
    hapi.auth.strategy('jwt', 'jwt', {
      key: new Buffer(process.env.CLIENT_SECRET, 'utf8'),
      cookieKey: 'sessionToken',
      validateFunc: (decoded, request, callback) => fetchUserAndRoles(decoded.sub, callback),
      verifyOptions: {
        algorithms: [ 'HS256' ],
        audience: process.env.CLIENT_ID,
      },
    });
  },
  graphql: {
    schema,
  },
});

server.start();
```

### Using Pres In Routes

```javascript
export default [
  {
    path: '/route-name',
    method: ['GET'],
    handler(request, reply) {
      // ...
    },
    config: {
      auth: false,
      pre: [
        {method: HTTPServer.getPre('verifyRole')},
      ],
    },
  },
];
```

## Setting Up A WorkerServer

```javascript
import {WorkerServer, MINUTE} from 'distraught';

const debug = process.env.WORKER_DEBUG; // toggle debugging
const REQUIRED_ENV = []; // required environment variables


const handlerOne = require('./handlerOne');
const handlerTwo = require('./handlerTwo');
const afterKilledHook = require('./afterKilledHook');

const workerServer = new WorkerServer({
  requiredEnv: REQUIRED_ENV,
  queues: [
    {name: 'queueOne', concurrency: 3, handler: handlerOne, isEnabled: isEnabledBool, alertAt: MINUTE, killAt: MINUTE * 5, debug},
    {name: 'queueTwo', handler: handleTwo, isEnabled: isEnabledBool2, alertAt: MINUTE * 10, killAt: MINUTE * 20, debug, onKilled: afterKilledHook},
  ],
});
workerServer.start();
```

### Enqueueing jobs

```javascript
import {WorkerServer} from 'distraught';

const queueName = 'queueName';

// static method
await WorkerServer.enqueue(queueName, {recordId: record.id}); // once enqueued, the workerServer will dequeue from RabbitMQ
```

### Pausing A Queue

```javascript
import {WorkerServer, HOUR} from 'distraught';

const queueName = 'queueName';

// static method
WorkerServer.pauseFor(queueName, HOUR)
  .then(() => {
    console.log(`${queueName} paused for ${HOUR} hours`);
  });
```

## Caching

Note that `process.env.APP_NAME` needs to be set in your ENV vars in order to uniquely partition your projects' caches

### Caching Individual Functions

Getting value from cache by key, or setting it via a function

```javascript
  import {cache, MINUTE} from 'distraught';
  import Promise from 'bluebird';

  const key = 'all-users';
  const getValueFn = function() {
    return functionThatAsyncronouslyReturnsUsers();
  }; // Can be a scalar, function returning a scalar, or function returning a Promise
  const ttl = MINUTE * 3;

  function getUsers() {
    return cache.getOrSet(key, getValueFn, ttl)
      .then((users) => {
        console.log(users);
      });
  }
```

In the above example: the first time `getUsers()` is called, it won't have a key of `all-users` in the cache
so it will fetch them with the `getValueFn`.

The second time its called, `all-users` will be in the cache so it's returned immediately from the cache engine

### Invalidating Keys

The below example will remove `all-users` from the cache

```javascript
  import {cache} from 'distraught';

  const key = 'all-users';
  return cache.invalidate(key);
```

### Hapi Routes

(Note: this just is using browser caching, it won't use your caching engine)

```javascript
import {MINUTE} from 'distraught';

server.route({
  path: '/v1/users',
  method: 'GET',
  handler(request, reply) {
    return functionThatAsyncronouslyReturnsUsers();
  },
  config: {
    cache: {
      expiresIn: MINUTE * 3,
      privacy: 'private', // 'public' or 'private'
    },
  },
});
```

### GraphQL Query Caching With pgObject

```javascript
  import {MINUTE, gql} from 'distraught';

  export const userType = gql.pgObject({
    name: 'User',
    description: 'A person who registered on our web server',
    columns: () => ({
      id: gql.id(),
      name: gql.string('Full name of user'),
    }),
    filters: {
      ...
    },
    cacheTTL: MINUTE,
    resolve(parent, filters, user, knex) {
      ...
    },
  });
```
