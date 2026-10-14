import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const target = process.env.TURBOMUSIC_SERVER ?? 'http://localhost:47813';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': target } },
  css: { postcss: path.resolve(__dirname) },
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
