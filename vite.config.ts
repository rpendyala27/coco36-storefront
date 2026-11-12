import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { removeSourceMaps, sentryViteSettings } from './scripts/sentryViteOptions';

// No `define` of server secrets: anything defined here is inlined into the
// public JS bundle. Client code reads only VITE_* vars (import.meta.env), and
// those must be public by design (Supabase anon key, Razorpay key id, API URL).
// scripts/check-bundle-secrets.mjs enforces this after every build.
// __SENTRY_RELEASE__ and __SENTRY_ENVIRONMENT__ are the commit SHA and
// VERCEL_ENV. They are not secrets. SENTRY_AUTH_TOKEN is never defined here.
export default defineConfig(() => {
  const sentry = sentryViteSettings(process.env);
  return {
    define: {
      __SENTRY_RELEASE__: JSON.stringify(sentry.release ?? ''),
      __SENTRY_ENVIRONMENT__: JSON.stringify(sentry.environment ?? ''),
    },
    plugins: [
      react(),
      tailwindcss(),
      // After the other plugins so the upload sees the finished bundle.
      // Omitted entirely when there is no auth token.
      ...(sentry.enabled ? [sentryVitePlugin(sentry.pluginOptions)] : []),
      {
        name: 'delete-source-maps',
        apply: 'build' as const,
        closeBundle() {
          removeSourceMaps(path.resolve(__dirname, 'dist'));
          removeSourceMaps(path.resolve(__dirname, 'dist-server'));
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Hidden maps exist only for the Sentry upload, and only when the
      // auth token is set. The plugin deletes them after upload; the
      // closeBundle hook above deletes anything left over.
      sourcemap: sentry.sourcemap,
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
