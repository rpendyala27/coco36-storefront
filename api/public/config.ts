import type { IncomingMessage, ServerResponse } from 'node:http';
import { rejectCodOrder } from '../../server/catalog.js';
import { readHandlingDaysLive } from '../../server/dispatchZone.js';
import type { ServiceEnv } from '../../server/notifyStore.js';
import { withSentry } from '../../server/sentry.js';

/**
 * Same-origin slice of public config: dispatch handling_days from the India
 * delivery zone, and whether a cash-on-delivery order would be accepted.
 * Shipping and returns still come from the admin /api/public/config.
 * handlingDays is null when the zone read fails. DISPATCH_WINDOW is not
 * sent, so the trust band hides the ships line instead of showing a guessed
 * number. codEnabled is true only when settings `cod.enabled` is JSON true;
 * a missing or failed read is false.
 */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const [handlingDays, codOrder] = await Promise.all([
    readHandlingDaysLive(process.env as ServiceEnv, fetch),
    rejectCodOrder('cod'),
  ]);
  res.statusCode = 200;
  res.end(JSON.stringify({ handlingDays, codEnabled: codOrder == null }));
}

export default withSentry(handler);
