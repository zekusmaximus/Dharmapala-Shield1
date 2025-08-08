import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: false
  },
  preview: {
    port: 5174
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});