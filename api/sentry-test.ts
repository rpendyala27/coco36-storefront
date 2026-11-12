import type { IncomingMessage, ServerResponse } from 'node:http';
import { withSentry } from '../server/sentry.js';
import { decideSentryTest, headerValue, probeFromUrl } from '../server/sentryTest.js';

/**
 * Post-merge check that the public cannot trigger.
 *
 * 404 unless the `X-Sentry-Test` header equals the server-only
 * SENTRY_TEST_SECRET (also 404 when that variable is unset). A match with
 * `?probe=browser` returns 204 and does not throw. Any other match throws,
 * the wrapper flushes the event, and the platform responds 500.
 *
 * The browser opens `/?sentry_test=<secret>`, strips that query immediately,
 * and only then calls this route with the header and `probe=browser`.
 */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const decision = decideSentryTest({
    secret: process.env.SENTRY_TEST_SECRET,
    header: headerValue(req.headers['x-sentry-test']),
    probe: probeFromUrl(req.url),
  });
  if (decision === 'deny') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }
  if (decision === 'browser') {
    res.statusCode = 204;
    res.end();
    return;
  }
  throw new Error('Sentry server test');
}

export default withSentry(handler);
