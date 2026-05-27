import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import {
  AuthConfig,
  Logger,
  formatClient,
  loadAuthorizedClients,
} from './pty-core.ts';

const SESSION_PATH_RE = /^\/session\/([0-9a-f-]{36})$/i;

function extractClientId(req: IncomingMessage): string | null {
  try {
    const pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    const match = SESSION_PATH_RE.exec(pathname);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isSessionAuthorized(
  req: IncomingMessage,
  auth: AuthConfig,
  logger: Logger,
): boolean {
  const clientId = extractClientId(req);
  if (!clientId) {
    logger.warn('[session] connection rejected: missing client id in path');
    return false;
  }
  if (auth.trustAll) return true;
  const authorized = loadAuthorizedClients(auth.authFile, logger);
  if (!authorized.has(clientId)) {
    logger.warn(
      `[session] connection rejected: ${clientId} not in allowlist`,
    );
    return false;
  }
  return true;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m${seconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${minutes % 60}m`;
}

/**
 * Tracks WebXR-app presence per client. The headset opens a session
 * socket on mount and lets the close on tab-close/unload signal end of
 * session — independent of any PTYs or keyboard sockets, which come
 * and go during a session.
 */
export function attachSessionHandlers(
  wss: WebSocketServer,
  logger: Logger,
  auth: AuthConfig,
): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientId = extractClientId(req);
    if (!clientId) {
      ws.close();
      return;
    }
    const who = formatClient(
      clientId,
      loadAuthorizedClients(auth.authFile, logger),
    );
    const origin = req.headers.origin ?? 'unknown origin';
    const openedAt = Date.now();
    logger.info(`[session] ${who} connected from ${origin}`);

    ws.on('close', () => {
      const duration = formatDuration(Date.now() - openedAt);
      logger.info(`[session] ${who} disconnected after ${duration}`);
    });

    ws.on('error', (err) => {
      logger.error(`[session] socket error for ${who}: ${String(err)}`);
    });
  });

  wss.on('error', (err) => {
    logger.error(`[session] server error: ${String(err)}`);
  });
}
