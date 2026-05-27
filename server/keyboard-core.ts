import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import {
  AuthConfig,
  Logger,
  formatClient,
  loadAuthorizedClients,
} from './pty-core.ts';

const TARGET_PATH_RE = /^\/keyboard\/([0-9a-f-]{36})$/i;

/**
 * Pulls the target client ID out of `/keyboard/<uuid>`. Returns null if
 * the path doesn't match the expected shape.
 */
function extractTargetClientId(req: IncomingMessage): string | null {
  try {
    const pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    const match = TARGET_PATH_RE.exec(pathname);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * The only auth check is that the target client ID (in the path) is in
 * the allowlist. Anyone who knows a valid target UUID can already open
 * `/pty?clientId=<target>` and run arbitrary commands, so requiring an
 * additional sender UUID adds no marginal security — only friction.
 */
export function isKeyboardAuthorized(
  req: IncomingMessage,
  auth: AuthConfig,
  logger: Logger,
): boolean {
  const target = extractTargetClientId(req);

  if (!target) {
    logger.warn('[keyboard] connection rejected: missing target in path');
    return false;
  }

  if (auth.trustAll) return true;

  const authorized = loadAuthorizedClients(auth.authFile, logger);
  if (!authorized.has(target)) {
    logger.warn(
      `[keyboard] connection rejected: target ${target} not in allowlist`,
    );
    return false;
  }

  return true;
}

/**
 * Per-target room of connected sockets. Each room is a tiny pubsub: a
 * message from any socket gets forwarded to every other socket in the
 * same room. The headset opens a socket and reads; the laptop opens one
 * and writes; the broker doesn't care which is which.
 */
const rooms = new Map<string, Set<WebSocket>>();

export function attachKeyboardHandlers(
  wss: WebSocketServer,
  logger: Logger,
  auth: AuthConfig,
): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const target = extractTargetClientId(req);
    if (!target) {
      // Should have been caught by isKeyboardAuthorized, but be defensive.
      ws.close();
      return;
    }

    const who = formatClient(target, loadAuthorizedClients(auth.authFile, logger));

    let room = rooms.get(target);
    if (!room) {
      room = new Set();
      rooms.set(target, room);
    }
    room.add(ws);
    logger.info(
      `[keyboard] joined room ${who} (now ${room.size} client${room.size === 1 ? '' : 's'})`,
    );

    ws.on('message', (message: Buffer) => {
      const data = message.toString('utf8');
      const peers = rooms.get(target);
      if (!peers) return;
      for (const peer of peers) {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(data);
        }
      }
    });

    ws.on('close', () => {
      const peers = rooms.get(target);
      if (peers) {
        peers.delete(ws);
        if (peers.size === 0) rooms.delete(target);
      }
      logger.info(`[keyboard] left room ${who}`);
    });

    ws.on('error', (err) => {
      logger.error(`[keyboard] socket error for ${who}: ${String(err)}`);
    });
  });

  wss.on('error', (err) => {
    logger.error(`[keyboard] server error: ${String(err)}`);
  });
}
