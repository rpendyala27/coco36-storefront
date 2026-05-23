import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split heavy dependencies into their own chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'animation':       ['motion', 'gsap'],
            'icons':           ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
