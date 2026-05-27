import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { ptyPlugin } from './vite-plugin/pty.ts';
import {
  attachPtyHandlers,
  isAuthorized,
  resolveAuthFile,
} from './server/pty-core.ts';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const auth = {
  authFile: resolveAuthFile(),
  trustAll: process.env.VR_TRUST_ALL === '1',
};

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    ptyPlugin({
      path: '/pty',
      watchDir: resolve(projectRoot, 'server'),
      backend: {
        isAuthorized: (req) => isAuthorized(req, auth),
        attachHandlers: attachPtyHandlers,
      },
    }),
  ],
  server: {
    // Permit access via cloudflared (and any other reverse proxy hostname).
    // Auth is enforced by the clientId allowlist on the PTY upgrade path.
    allowedHosts: true,
  },
});
