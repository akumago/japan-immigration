import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
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
            }
          }
        }
      }
    };
});
