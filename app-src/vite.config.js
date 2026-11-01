import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.BOS_API || 'https://api.bos.work/app/api/rest';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    // Dev-only stand-in for the WordPress proxy (the API has no CORS headers).
    proxy: {
      '/api': {
        target: API,
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 BOSLessonsWeb' },
      },
    },
  },
  build: {
    outDir: '../app',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'bos-lessons.js',
        assetFileNames: 'bos-lessons[extname]',
      },
    },
  },
});
