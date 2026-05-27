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
 * Contract the plugin needs from a PTY backend. Lives here (not in
 * `server/`) so the backend stays unaware of Vite.
 */
export interface PtyBackend {
  /** Returns true if the upgrade request is allowed to open a PTY. */
  isAuthorized(req: IncomingMessage, logger: Logger): boolean;
  /** Wires per-connection PTY handlers onto a WebSocketServer. */
  attachHandlers(wss: WebSocketServer, logger: Logger): void;
}

export interface PtyPluginOptions {
  /** Path the WebSocket upgrade must target (e.g. `/pty`). */
  path: string;
  /** Backend that owns the actual PTY lifecycle. */
  backend: PtyBackend;
  /**
   * Absolute directory whose files trigger a full Vite restart on change.
   * Use this for the backend's source so plugin + backend reload together.
   */
  watchDir?: string;
}

/**
 * Mounts a PTY WebSocket endpoint on Vite's HTTP server so the dev server
 * and PTY traffic share a single origin (works behind cloudflared, etc).
 *
 * Watching `watchDir` triggers `server.restart()` on change, which gives
 * us live reload for the backend at the cost of dropping live sessions.
 */
export function ptyPlugin(options: PtyPluginOptions): Plugin {
  const { path, backend, watchDir } = options;

  return {
    name: 'vr-ide:pty',
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

          // Leave non-PTY upgrades (Vite HMR, etc.) alone.
          if (pathname !== path) return;

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
