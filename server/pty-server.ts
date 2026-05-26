import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { IncomingMessage } from 'http';
import { userInfo } from 'os';
import { isClientMessage } from '../src/pty-protocol.ts';

const PORT = 8001;
const ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:9000', // Gatsby serve
  'http://127.0.0.1:9000',
];

/**
 * Gets the user's default shell.
 */
function getDefaultShell(): string {
  return process.env.VR_SHELL || userInfo().shell || 'bash';
}

/**
 * Validates that the WebSocket connection originates from a trusted localhost source.
 */
function isValidOrigin(origin: string | undefined): boolean {
  if (!origin) {
    console.warn('Connection rejected: No origin header');
    return false;
  }

  // Check if origin matches allowed localhost origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Also allow any localhost/127.0.0.1 origin for flexibility during dev
  const url = new URL(origin);
  const isLocalhost =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (!isLocalhost) {
    console.warn(`Connection rejected: Non-localhost origin "${origin}"`);
    return false;
  }

  return true;
}

/**
 * Validates the incoming connection request.
 */
function validateConnection(req: IncomingMessage): boolean {
  const origin = req.headers.origin;

  if (!isValidOrigin(origin)) {
    return false;
  }

  // Verify the request is coming to localhost
  const host = req.headers.host;
  if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    console.warn(`Connection rejected: Non-localhost host "${host}"`);
    return false;
  }

  return true;
}

// Create WebSocket server bound to localhost only
const wss = new WebSocketServer({
  port: PORT,
  host: '127.0.0.1', // Only accept local connections
  verifyClient: ({ req }, callback) => {
    const isValid = validateConnection(req);
    callback(isValid, isValid ? undefined : 403, 'Forbidden');
  },
});

console.log(`PTY server listening on ws://127.0.0.1:${PORT}`);
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  console.log(`New connection from origin: ${req.headers.origin}`);

  // Spawn a shell
  const shell = getDefaultShell();
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 38,
    cwd: process.cwd(),
    env: process.env,
  });

  console.log(`Spawned ${shell} with PID ${ptyProcess.pid}`);

  // Relay PTY output to WebSocket
  ptyProcess.onData((data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY exited with code ${exitCode}, signal ${signal}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
      ws.close();
    }
  });

  // Handle messages from WebSocket
  ws.on('message', (message: Buffer) => {
    try {
      const msg: unknown = JSON.parse(message.toString());
      if (!isClientMessage(msg)) {
        console.warn('Received invalid message from client');
        return;
      }

      switch (msg.type) {
        case 'input':
          ptyProcess.write(msg.data);
          break;

        case 'resize':
          if (msg.cols > 0 && msg.rows > 0) {
            ptyProcess.resize(msg.cols, msg.rows);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket closed, killing PTY');
    ptyProcess.kill();
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    ptyProcess.kill();
  });
});

wss.on('error', (err) => {
  console.error('WebSocket server error:', err);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down PTY server...');
  wss.close(() => {
    process.exit(0);
  });
});
