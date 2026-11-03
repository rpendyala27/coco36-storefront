import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// No `define` of server secrets: anything defined here is inlined into the
// public JS bundle. Client code reads only VITE_* vars (import.meta.env), and
// those must be public by design (Supabase anon key, Razorpay key id, API URL).
// scripts/check-bundle-secrets.mjs enforces this after every build.
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
