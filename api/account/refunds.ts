import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAccountRefunds } from '../../server/accountRefunds.js';
import type { ServiceEnv } from '../../server/notifyStore.js';
import { withSentry } from '../../server/sentry.js';

/**
 * GET /api/account/refunds?orderIds=<uuid>,<uuid>
 * The signed-in shopper's refund status for their own orders. See
 * server/accountRefunds.ts for what is and is not returned.
 */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const result = await handleAccountRefunds({
    authorization: header(req, 'authorization'),
    orderIds: url.searchParams.get('orderIds'),
    env: process.env as ServiceEnv,
  });
  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
}

export default withSentry(handler);

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
