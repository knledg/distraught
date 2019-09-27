# Distraught Web Server

> I was distraught!!

Distraught is a wrapper around a Node.js Express server that exposes an HTTPServer for web requests, a CronServer for functions that need to be called at set intervals, and a WorkerServer to handle long requests. 

## Assumptions

- You have a webserver running Node.js
- Postgresql as the datastore
- Redis as the caching layer and sockets
- RabbitMQ for worker jobs

## Libraries

* [ExpressJS](https://expressjs.com)
* [Mariner - Vanilla SQL Database Migrations](https://www.npmjs.com/package/mariner)
* [Heretic - Queueing / Dequeueing Jobs](https://www.npmjs.com/package/heretic)
* [Google Cloud Storage - File Storage](https://www.npmjs.com/package/@google-cloud/storage)
* [Sentry - Error Handling](https://www.npmjs.com/package/raven)
* [Cron - For Timed Jobs](https://www.npmjs.com/package/cron)
* [Axios - For API Requests](https://www.npmjs.com/package/axios)
* [Sendgrid - Sending Emails](https://www.npmjs.com/package/sendgrid) 
* [Twilio - Text Messaging](https://www.npmjs.com/package/twilio)
* [Socket.IO - Websockets](https://www.npmjs.com/package/socket.io)
* [Swagger - API Documentation](https://swagger.io/swagger-ui/)

## Expected Migrations / Tables In Order To Use WorkerServer

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

## Processes

The framework is setup to run three processes: web, crons, and workers.

- Web
  - Will boot up the Express server
- Crons
  - These are processes that run in the background at set intervals
- Workers
  - Workers are background processes that may take quite a bit of time to complete, so they are enqueued to a RabbitMQ server via [Heretic, a simple RabbitMQ interface](https://github.com/bjyoungblood/heretic)

## Logging

- Supports sending all server logs to [Logentries](https://logentries.com/) if a `LOGENTRIES_TOKEN` is present.
- Supports sending uncaught/unhandled errors to [Sentry](https://sentry.io) if a `SENTRY_DSN` is present.

### Logging Errors

```javascript
const {logErr} = require('distraught');

logErr(new Error('Whoa..That\'s not good'), {
  var1: val1,
  var2: val2,
});
```

### Server Monitoring

In `httpserver`, if you specify `enableStatusMonitor: true`, a `/status` page will be accessible on the same port that the Express server is running that memory usage, CPU usage, response time, requests per second, and number of responses by status code using [express-status-monitor](https://www.npmjs.com/package/express-status-monitor)

## Database

- Utilizes [Knex](http://knexjs.org/) to handle your queries

### Setting Up Your Connections

```javascript

const d = require('distraught');

d.init({
  db: {
    r: { connection: process.env.READONLY_DATABASE_URL },
    rw: { connection: process.env.READWRITE_DATABASE_URL },
  },
  heretic: {
    default: { db: "r", connection: process.env.AMQP_URL },
  },
  cache: {
    default: { connection: process.env.REDIS_URL },
  },
  captureUncaught: true,
  captureUnhandled: true,
});
```

### Querying The Database

```javascript

const {db, toCamelCase, createOne} = require('distraught');

function fetchUsers() {
  return db.r('users')
    .column(['*'])
    .limit(1000)
    .then(toCamelCase);
}

function addUser(user) {
  return createOne(db.rw, 'users', user)
    .then(toCamelCase);
}
```

## HTTPServer

```javascript
const {httpServer, init} = require('distraught');

init({ 
  cache: {
    default: { connection: process.env.REDIS_URL },
  },
});

const homeController = require('./controllers/home');

const server = httpServer({
  publicPath: path.join(__dirname, 'public'),
  viewPath: path.join(__dirname, 'views'),
  findUserById(id: number) {
    return cache.default.getOrSet(`user-${id}`, fetchUserById.bind(null, id)); // Needed for passport middleware
  },
});

server.app.use((req, res, next) => {
  // ...some middleware/plugin logic
  next();
});

/* WEB ROUTES */
server.app.get('/', homeController.get);

authController.setAuthRoutes(server.app, server.passport);

server.start();
```

### Templates

By default, HTTPServer will render pug templates, but you can change the view engine to whatever you want during instantiation. 

#### Adding/Changing View Engines

```javascript
const {httpServer} = require('distraught');

const server = httpServer({
  viewEngine: 'jsx',
});

server.app.engine('jsx', (filePath, options, callback) => { 
  const html = templateRenderFn(filePath, options);
  callback(null, html);
});
```

### Swagger

To enable Swagger:

```javascript
const server = httpServer({
  swaggerConfig: {
    appRoot: __dirname,
    yamlPath: path.join(__dirname, 'api/swagger/swagger.yaml'),
  },
});
```

[Example of Creating API/Config Folders and Using the Swagger Editor](https://github.com/swagger-api/swagger-node)
[Swagger - Getting Started](https://github.com/swagger-api/swagger-node/blob/master/docs/README.md)


## WorkerServer

```javascript
// Make sure the Heretic database migration has run

const {init, workerServer, MINUTE, heretic, chalk, log} = require('distraught');

init({
  db: {
    r: { connection: process.env.READONLY_DATABASE_URL },
    rw: { connection: process.env.READWRITE_DATABASE_URL },
  },
  heretic: {
    default: { db: "r", connection: process.env.AMQP_URL },
  },
});


function testDequeue(job, message, done) {
  log(chalk.yellow('Dequeueing job: Test queue'));
  return Promise.resolve()
    .then(done);
}

function queueJob() {
  heretic.default.enqueue('test.dequeue', {});
  setTimeout(() => {
    queueJob();
  }, 5000);
}

function startWorkerServer() {
  const debug = process.env.WORKER_DEBUG;
  const workers = workerServer({
    heretic: heretic.default,
    requiredEnv: [],
    queues: [
      {name: 'test.dequeue', concurrency: 3, handler: testDequeue, isEnabled: process.env.NODE_ENV === 'development', alertAt: MINUTE, killAt: MINUTE * 2, debug},
    ],
  });
  workers.start();
};

queueJob();
startWorkerServer();
```

### Enqueueing jobs

```javascript
import {heretic} from 'distraught';

heretic.default.enqueue('test.dequeue', {});
```

## Crons

```javascript
const {cronServer, log, chalk} = require('distraught');

exports.startCronServer = () => {
  cronServer({
    crons: [
      {
        name: 'Ping',
        cronTime: '* * * * * *', // Every second
        onTick() {
          log(chalk.green('Pong'));
        },
      },
    ],
  });
};
```

## Caching

### Caching Individual Functions

Getting value from cache by key, or setting it via a function

```javascript
  const {init, cache, MINUTE} = require('distraught');

  init({
    cache: {
      default: { connection: process.env.REDIS_URL },
    },
  });

  const getValueFn = () => {
    return someFuncReturningData();
  }; // Can be a scalar, function returning a scalar, or function returning a Promise
  const ttl = MINUTE * 3;

  function getUsers() {
    return cache.default.getOrSet('all-users', getValueFn, ttl)
      .then((users) => console.log(users));
  }

  await getUsers(); // Cache missed
  await getUsers(); // Cache hit
```

### Invalidating Keys

The below example will remove `all-users` from the cache

```javascript
  const {cache} = require('distraught');
  cache.default.invalidate('all-users');
```

### Thanks

Thanks to [Hackathon Starter](https://github.com/sahat/hackathon-starter) for a lot of inspiration
