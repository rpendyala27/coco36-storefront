import type { IncomingMessage, ServerResponse } from 'node:http';
import { readHandlingDays } from '../../server/dispatchZone.js';
import type { ServiceEnv } from '../../server/notifyStore.js';

/**
 * Same-origin slice of public config: dispatch handling_days from the India
 * delivery zone. Shipping and returns still come from the admin
 * /api/public/config. This route only adds handlingDays. Service role read;
 * no anon grant change. Fallback is DISPATCH_WINDOW when the read fails.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const handlingDays = await readHandlingDays(process.env as ServiceEnv, fetch);
  res.statusCode = 200;
  res.end(JSON.stringify({ handlingDays }));
}
