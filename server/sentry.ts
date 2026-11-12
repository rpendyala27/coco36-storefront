import type { IncomingMessage, ServerResponse } from 'node:http';
import * as Sentry from '@sentry/node';
import { scrubSentryEvent } from '../src/lib/sentryScrub.js';

/**
 * Error reporting for the Vercel Node server function.
 *
 * Init runs only when SENTRY_DSN is set, so CI and tests send nothing.
 * ESM loader hooks stay off: this function is already native Node ESM, and
 * a previous outage came from the runtime failing to resolve modules.
 * Local variables stay off so a stack frame cannot carry the service role
 * key. Each captured error is flushed before the handler returns or rethrows,
 * because the platform freezes the process after the response.
 */

const FLUSH_MS = 2000;

let started = false;
let ready = false;

export function ensureServerSentry(): void {
  if (started) return;
  started = true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      includeLocalVariables: false,
      registerEsmLoaderHooks: false,
      // Do not attach sentry-trace to Supabase or Resend calls.
      tracePropagationTargets: [],
      integrations: (defaults) => defaults
        .filter((integration) => integration.name !== 'LocalVariablesAsync' && integration.name !== 'LocalVariables')
        .map((integration) => {
          if (integration.name === 'Http') {
            return Sentry.httpIntegration({
              trackIncomingRequestsAsSessions: false,
              tracePropagation: false,
              maxIncomingRequestBodySize: 'none',
            });
          }
          if (integration.name === 'NodeFetch') {
            return Sentry.nativeNodeFetchIntegration({ tracePropagation: false });
          }
          return integration;
        }),
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
    ready = true;
  } catch (error) {
    console.error('[sentry] init failed', error instanceof Error ? error.name : 'error');
  }
}

/** Capture and flush. A Sentry outage does not change the HTTP response. */
export async function reportServerException(error: unknown): Promise<void> {
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    ensureServerSentry();
    if (!ready) return;
    Sentry.captureException(error);
    await Sentry.flush(FLUSH_MS);
  } catch (flushError) {
    console.error('[sentry] flush failed', flushError instanceof Error ? flushError.name : 'error');
  }
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Reports errors that escape a handler, flushes them, then rethrows so
 * Vercel still returns its normal 500. Handlers that catch and answer
 * (notify's 503, for example) pass through unchanged.
 */
export function withSentry(handler: Handler): Handler {
  return async (req, res) => {
    ensureServerSentry();
    try {
      await handler(req, res);
    } catch (error) {
      await reportServerException(error);
      throw error;
    }
  };
}

ensureServerSentry();
