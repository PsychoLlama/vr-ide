import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { wsRoutePlugin } from './vite-plugin/ws-route.ts';
import {
  attachPtyHandlers,
  isAuthorized,
  resolveAuthFile,
} from './server/pty-core.ts';
import {
  attachKeyboardHandlers,
  isKeyboardAuthorized,
} from './server/keyboard-core.ts';
import {
  attachSessionHandlers,
  isSessionAuthorized,
} from './server/session-core.ts';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(projectRoot, 'server');

const auth = {
  authFile: resolveAuthFile(),
  trustAll: process.env.VR_TRUST_ALL === '1',
};

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    wsRoutePlugin({
      name: 'vr-ide:pty',
      match: (p) => p === '/pty',
      watchDir: serverDir,
      backend: {
        isAuthorized: (req, logger) => isAuthorized(req, auth, logger),
        attachHandlers: (wss, logger) => attachPtyHandlers(wss, logger, auth),
      },
    }),
    wsRoutePlugin({
      name: 'vr-ide:keyboard',
      match: (p) => p.startsWith('/keyboard/'),
      watchDir: serverDir,
      backend: {
        isAuthorized: (req, logger) => isKeyboardAuthorized(req, auth, logger),
        attachHandlers: (wss, logger) =>
          attachKeyboardHandlers(wss, logger, auth),
      },
    }),
    wsRoutePlugin({
      name: 'vr-ide:session',
      match: (p) => p.startsWith('/session/'),
      watchDir: serverDir,
      backend: {
        isAuthorized: (req, logger) => isSessionAuthorized(req, auth, logger),
        attachHandlers: (wss, logger) =>
          attachSessionHandlers(wss, logger, auth),
      },
    }),
  ],
  server: {
    // Permit access via cloudflared (and any other reverse proxy hostname).
    // Auth is enforced by the clientId allowlist on each WS route.
    allowedHosts: true,
  },
});
