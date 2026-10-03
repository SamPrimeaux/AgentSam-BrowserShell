import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);

export default defineConfig({
  root,
  plugins: [react()],
  // `allowedHosts: true` keeps sandboxed/tunnelled previews (e2b, ngrok,
  // device testing over LAN) working. Lock this down for production hosting.
  server: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { outDir: path.join(root, 'dist'), emptyOutDir: true },
});
