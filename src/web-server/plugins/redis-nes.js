import util from 'util';
import {EventEmitter} from 'events';
import redis from 'redis';

function Adapter(redisUrl) {
  EventEmitter.call(this);

  this.ready = false;
  this._pub = redis.createClient(redisUrl);
  this._sub = redis.createClient(redisUrl);

  this._pub.on('ready', () => {
    this.ready = true;
  });

  this._pub.on('error', (err) => {
    this.emit('error', err);
  });

  this._sub.on('error', (err) => {
    this.emit('error', err);
  });

  this._sub.psubscribe('nes:*', (err) => {
    if (err) {
      this.emit('error', err);
    }
  });

  this._sub.on('pmessage', (pattern, channel, message) => {
    const parsed = JSON.parse(message);

    if (channel === 'nes:publish') {
      this.emit('publish', parsed.path, parsed.message);
    } else if (channel === 'nes:broadcast') {
      this.emit('broadcast', parsed.message);
    }
  });

}

util.inherits(Adapter, EventEmitter);

Adapter.prototype.broadcast = function(update) {
  this._pub.publish('nes:broadcast', JSON.stringify({
    message: update,
  }));
};

Adapter.prototype.publish = function(path, message) {
  this._pub.publish('nes:publish', JSON.stringify({
    path: path,
    message: message,
  }));
};

Adapter.prototype.stop = function() {
  this._pub.end();
  this._sub.end();
};

function plugin(server, options, next) {
  server.dependency('nes', (srv, done) => {
    const adapter = new Adapter(process.env.REDIS_URL);

    adapter.on('publish', (path, message) => {
      srv.publish(path, message);
    });

    adapter.on('broadcast', (message) => {
      srv.broadcast(message);
    });

    adapter.on('error', (err) => {
      server.log(['nes', 'adapter', 'error'], err);
    });

    srv.decorate('server', 'broadcastEvent', function(update) {
      adapter.broadcast(update);
    });

    srv.decorate('server', 'publishEvent', function(path, message) {
      adapter.publish(path, message);
    });

    srv.ext('onPreStop', (extSrv, extNext) => {
      adapter.stop();
      extNext();
    });

    done();
  });

  next();
}

plugin.attributes = {
  pkg: require('../../../package.json'),
};

export default function register(server) {
  if (process.env.REDIS_URL) {
    server.register(plugin, function(err) {
      if (err) {
        throw err;
      }
    });
  }
}
