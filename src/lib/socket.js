// @flow

/**
 * [createConnection - singleton instance of IO connection]
 */
let io;
let isConnected = false;
let socket;

/**
 * Given a webserver (such as Express), create a socket connection and mark isConnected true
 * @param {Object} server
 */
function createSocketConnection(server: {app: any, io: any}) {
  io = server.io;
  io.on('connection', (connection: {emit: Function}) => {
    isConnected = true;
    socket = connection;
  });
}

/**
 * Given a room and a payload, asyncronously sends payload to that room
 * @param {String} room
 * @param {Object} payload
 */
function emit(room: string, payload: Object): null|void {
  return isConnected ? socket.emit(room, payload) : null;
}

module.exports = {createSocketConnection, emit};
