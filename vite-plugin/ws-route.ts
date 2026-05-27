import type { Plugin } from 'vite';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer } from 'ws';

/**
 * Minimal logger contract the backend writes through. Vite's
 * `server.config.logger` satisfies this structurally.
 */
export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/**
 * Contract a WebSocket backend implements. Lives here (not in `server/`)
 * so backends stay unaware of Vite.
 */
export interface WsBackend {
  /** Returns true if the upgrade request is allowed through. */
  isAuthorized(req: IncomingMessage, logger: Logger): boolean;
  /** Wires per-connection handlers onto a WebSocketServer. */
  attachHandlers(wss: WebSocketServer, logger: Logger): void;
}

export interface WsRouteOptions {
  /** Plugin name as it appears in Vite logs (e.g. `vr-ide:pty`). */
  name: string;
  /** Returns true for upgrade paths this route should claim. */
  match: (pathname: string) => boolean;
  /** Backend that owns the per-connection lifecycle. */
  backend: WsBackend;
  /**
   * Absolute directory whose files trigger a full Vite restart on change.
   * Use this for the backend's source so plugin + backend reload together.
   */
  watchDir?: string;
}

/**
 * Mounts a WebSocket route on Vite's HTTP server so the dev server and
 * the backend share a single origin (works behind cloudflared, etc).
 *
 * Watching `watchDir` triggers `server.restart()` on change, which gives
 * us live reload for the backend at the cost of dropping live sessions.
 */
export function wsRoutePlugin(options: WsRouteOptions): Plugin {
  const { name, match, backend, watchDir } = options;

  return {
    name,
    configureServer(server) {
      const logger = server.config.logger;
      const wss = new WebSocketServer({ noServer: true });
      backend.attachHandlers(wss, logger);

      server.httpServer?.on(
        'upgrade',
        (req: IncomingMessage, socket: Duplex, head: Buffer) => {
          let pathname: string;
          try {
            pathname = new URL(req.url ?? '', 'http://localhost').pathname;
          } catch {
            return;
          }

          // Leave non-matching upgrades (Vite HMR, other routes) alone.
          if (!match(pathname)) return;

          if (!backend.isAuthorized(req, logger)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
          }

          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        },
      );

      if (watchDir) {
        server.watcher.add(watchDir);
        server.watcher.on('change', (file) => {
          if (file.startsWith(watchDir)) {
            void server.restart();
          }
        });
      }
    },
  };
}
