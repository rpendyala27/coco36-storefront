/**
 * Sentry init for the Vite storefront.
 *
 * No-op unless VITE_SENTRY_DSN is set, so local dev, CI, and tests send
 * nothing. The DSN is the only VITE_ Sentry value. Release and environment
 * are baked in at build time from VERCEL_GIT_COMMIT_SHA and VERCEL_ENV.
 * Replay stays off. Traces stay at 0.1, and trace headers go only to
 * same-origin requests.
 */
import * as Sentry from '@sentry/react';
import { isChunkLoadError } from './chunkLoad';
import { scrubSentryEvent } from './sentryScrub';

declare const __SENTRY_RELEASE__: string | undefined;
declare const __SENTRY_ENVIRONMENT__: string | undefined;

function defined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export function sentryRelease(): string | undefined {
  return defined(typeof __SENTRY_RELEASE__ === 'string' ? __SENTRY_RELEASE__ : undefined);
}

/** VERCEL_ENV when the build had it. `vite build` is always MODE=production, including Preview. */
export function sentryEnvironment(): string {
  return defined(typeof __SENTRY_ENVIRONMENT__ === 'string' ? __SENTRY_ENVIRONMENT__ : undefined)
    || import.meta.env.MODE;
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: sentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    // Same-origin requests only. Supabase and Razorpay are other origins,
    // so they do not get sentry-trace headers.
    tracePropagationTargets: [/^\//],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: (defaults) => {
      const withoutReplay = defaults.filter((integration) => integration.name !== 'Replay');
      if (withoutReplay.some((integration) => integration.name === 'BrowserTracing')) return withoutReplay;
      return [
        ...withoutReplay,
        Sentry.browserTracingIntegration(),
      ];
    },
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
    beforeSendTransaction(event) {
      return scrubSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubSentryEvent(breadcrumb);
    },
  });

  installChunkLoadReporting();
}

/**
 * A failed `<script>` or `<link>` does not reject a React lazy() promise, so
 * the error boundary never sees it. Dynamic-import failures still throw into
 * the boundary; this listener covers the asset-tag path. Chunk failures are
 * not ignored.
 */
function installChunkLoadReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) return;
    const src = target instanceof HTMLScriptElement ? target.src : target.href;
    if (!src || !src.includes('/assets/')) return;
    const error = new Error(`Failed to load chunk: ${src.split('?')[0]}`);
    if (!isChunkLoadError(error)) return;
    Sentry.captureException(error, { tags: { chunk_load: 'true' } });
  }, true);
}

export { Sentry };
