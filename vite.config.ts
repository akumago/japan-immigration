import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id, { getModuleInfo }) {
              if (id.includes('node_modules')) {
                if (id.includes('framer-motion')) return 'vendor-motion';
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('react-helmet')) return 'vendor-react';
              }
              if (id.includes('newsData.json')) return 'data-news';
              if (id.includes('constants.tsx')) return 'data-constants';
            }
          }
        }
      }
    };
});
