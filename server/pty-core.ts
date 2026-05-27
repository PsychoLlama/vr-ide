import { WebSocket, WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { IncomingMessage } from 'http';
import { userInfo } from 'os';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isClientMessage } from '../src/pty-protocol.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthConfig {
  /** Path to the JSON file listing authorized client IDs. */
  authFile: string;
  /** Skip the clientId check entirely. */
  trustAll: boolean;
}

export function resolveAuthFile(): string {
  return process.env.VR_AUTHORIZED_CLIENTS
    ? resolve(process.env.VR_AUTHORIZED_CLIENTS)
    : resolve(process.cwd(), '.authorized-clients.json');
}

function getDefaultShell(): string {
  return process.env.VR_SHELL || userInfo().shell || 'bash';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads the authorized client IDs from disk. Called per connection so edits
 * take effect without restarting the server.
 */
export function loadAuthorizedClients(authFile: string): Set<string> {
  let raw: string;
  try {
    raw = readFileSync(authFile, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    console.error(`Failed to read ${authFile}:`, err);
    return new Set();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const ids = new Set<string>();
    if (!isObject(parsed) || !Array.isArray(parsed.clients)) return ids;
    for (const entry of parsed.clients as unknown[]) {
      if (isObject(entry) && typeof entry.id === 'string') {
        ids.add(entry.id.toLowerCase());
      }
    }
    return ids;
  } catch (err) {
    console.error(`Failed to parse ${authFile}:`, err);
    return new Set();
  }
}

/**
 * Extracts and validates the clientId query parameter from the upgrade
 * request URL. Returns null when missing or malformed.
 */
export function extractClientId(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const id = url.searchParams.get('clientId');
    if (!id || !UUID_RE.test(id)) return null;
    return id.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns true when the request bears an authorized client ID (or auth is
 * disabled). Logs rejection reasons to guide setup.
 */
export function isAuthorized(req: IncomingMessage, auth: AuthConfig): boolean {
  if (auth.trustAll) return true;

  const clientId = extractClientId(req);
  if (!clientId || !loadAuthorizedClients(auth.authFile).has(clientId)) {
    console.warn(
      `PTY connection rejected from ${req.headers.origin ?? 'unknown origin'}\n` +
        `  Client ID: ${clientId ?? 'missing'}\n` +
        `  To authorize, add the ID to ${auth.authFile}:\n` +
        `    { "clients": [{ "id": "<uuid>", "label": "optional" }] }\n` +
        `  Or enable trust mode to disable approval.`,
    );
    return false;
  }

  return true;
}

/**
 * Wires the per-connection PTY lifecycle (spawn shell, relay i/o, clean up
 * on close) onto a WebSocketServer. The server itself (port, noServer
 * mode, host binding) is the caller's choice.
 */
export function attachPtyHandlers(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`PTY connection from origin: ${req.headers.origin}`);

    const shell = getDefaultShell();
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 38,
      cwd: process.cwd(),
      env: process.env,
    });

    console.log(`Spawned ${shell} with PID ${ptyProcess.pid}`);

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
}
