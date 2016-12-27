# Distraught Web Server

> I was distraught!!

Distraught is a wrapper around a Node.js Hapi server that exposes an HTTPServer for web requests, a CronServer for functions that need to be called at set intervals, and a WorkerServer to handle long requests.

This does require some migrations to be ran, however this server does -not- run the migrations on startup. If you are using Distraught for the first time, please run the following migration:

```sql
--
-- Name: heretic_jobs; Type: TABLE; Schema: public; Owner: db
--

CREATE TABLE heretic_jobs (
    id integer NOT NULL,
    queue_name text NOT NULL,
    status text DEFAULT 'pending'::text,
    payload jsonb,
    attempt_logs jsonb[] DEFAULT '{}'::jsonb[],
    max_attempts integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempted_at timestamp with time zone
);


ALTER TABLE heretic_jobs OWNER TO db;

--
-- Name: heretic_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: db
--

CREATE SEQUENCE heretic_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE heretic_jobs_id_seq OWNER TO db;

--
-- Name: heretic_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: db
--

ALTER SEQUENCE heretic_jobs_id_seq OWNED BY heretic_jobs.id;
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
import {WorkerServer} from 'distraught';

const SECONDS = 1000 * 1;
const MINUTES = SECONDS * 60;

const debug = process.env.WORKER_DEBUG; // toggle debugging
const REQUIRED_ENV = []; // required environment variables


const handlerOne = require('./handlerOne');
const handlerTwo = require('./handlerTwo');
const afterKilledHook = require('./afterKilledHook');

const workerServer = new WorkerServer({
  requiredEnv: REQUIRED_ENV,
  queues: [
    {name: 'queueOne', concurrency: 3, handler: handlerOne, isEnabled: isEnabledBool, alertAt: MINUTES * 1, killAt: MINUTES * 5, debug},
    {name: 'queueTwo', handler: handleTwo, isEnabled: isEnabledBool2, alertAt: MINUTES * 10, killAt: MINUTES * 20, debug, onKilled: afterKilledHook},
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
import {WorkerServer} from 'distraught';

const SECONDS = 1000 * 1;
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;

const queueName = 'queueName';

// static method
WorkerServer.pauseFor(queueName, HOURS * 1)
  .then(() => {
    console.log(`${queueName} paused for ${HOURS * 1} hours`);
  });
```