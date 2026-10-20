import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { unlinkSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const hotFile = resolve(here, 'hot');

const hotMarker = {
  name: 'kikost-hot-marker',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      const address = server.httpServer.address();
      const port = typeof address === 'object' && address ? address.port : 5173;
      writeFileSync(hotFile, `http://127.0.0.1:${port}`, 'utf8');
    });
    server.httpServer?.once('close', () => {
      try { unlinkSync(hotFile); } catch {}
    });
  },
};

export default defineConfig(({ command, mode }) => {
  const isDemo = process.env.VITE_DEMO_MODE === 'true' || mode === 'demo';

  // Konfigurasi Khusus Build Demo Vercel:
  // Terisolasi ke frontend/dist, base '/', dan input index.html
  if (isDemo) {
    return {
      root: here,
      plugins: [react()],
      base: '/',
      build: {
        outDir: resolve(here, 'dist'),
        emptyOutDir: true,
        rollupOptions: { input: resolve(here, 'index.html') },
      },
    };
  }

  // Konfigurasi Default XAMPP Lokal (Pertahankan 100%):
  return {
    root: here,
    plugins: [react(), hotMarker],
    base: command === 'serve' ? '/' : '/kikost-spk/assets/react/',
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true, cors: true,
      proxy: { '/kikost-spk/api': { target: 'http://localhost', changeOrigin: false } },
    },
    build: {
      manifest: true,
      outDir: resolve(here, '../assets/react'),
      emptyOutDir: true,
      rollupOptions: { input: resolve(here, 'src/main.jsx') },
    },
  };
});
