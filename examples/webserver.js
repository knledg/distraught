process.env.SESSION_SECRET = '1';

// http://localhost:3000
const server = require('distraught').httpServer({});
server.app.get('/', (req, res) => res.send('Hello, world'));
server.start();
