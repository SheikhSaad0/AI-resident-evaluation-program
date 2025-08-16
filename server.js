import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

// Use await at the top level (allowed in ES Modules)
await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

// Use the imported WebSocketServer
const wss = new WebSocketServer({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const residentName = url.searchParams.get('residentName');

  console.log(`Client connected: ${residentName}`);
  clients.set(ws, residentName);

  ws.on('message', (message) => {
    console.log(`Received message from ${residentName}: ${message}`);
    // Broadcast message to all clients
    wss.clients.forEach((client) => {
      // Use numeric value for WebSocket.OPEN for safety
      if (client !== ws && client.readyState === 1) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${residentName}`);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${residentName}:`, error);
  });
});

server.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://localhost:${port}`);
});