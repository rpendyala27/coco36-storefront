/**
 * Sentry init for the Vite storefront.
 *
 * Only activates when VITE_SENTRY_DSN is set — keeps local dev quiet.
 * Wrapper around @sentry/react. Called once from main.tsx at boot.
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment:      import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii:   false,
  });
}

export { Sentry };
