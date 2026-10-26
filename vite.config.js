import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    /* Spreadsheets kept in the project are locked while Excel has them open,
       and the watcher dies on the EBUSY. The app never imports them. */
    watch: { ignored: ['**/*.xlsx', '**/*.xlsm', '**/~$*'] },
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
  },
  build: { outDir: 'dist', sourcemap: false }
});
