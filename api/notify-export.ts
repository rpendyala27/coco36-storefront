import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorizeJob, type NotifyEnv } from '../server/notify.js';
import { signupsToCsv } from '../server/notifyCsv.js';
import { listTallies, lookupAuthEmail, serviceCredentials, type ServiceEnv } from '../server/notifyStore.js';

/**
 * GET /api/notify-export — CSV of per-product sign-up counts.
 * Bearer NOTIFY_EXPORT_SECRET, or a Supabase user on NOTIFY_ADMIN_EMAILS.
 * Not scheduled. Reads with the service role only.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed\n');
    return;
  }
  const env = process.env as ServiceEnv;
  const auth = await authorizeJob(header(req, 'authorization'), env, (jwt) => lookupAuthEmail(env, jwt, fetch));
  if (auth === 'unconfigured') {
    res.statusCode = 404;
    res.end('Not found\n');
    return;
  }
  if (auth !== 'ok') {
    res.statusCode = 401;
    res.end('Unauthorized\n');
    return;
  }
  if (!serviceCredentials(env)) {
    res.statusCode = 503;
    res.end('Sign-up export is not available yet.\n');
    return;
  }
  try {
    const csv = signupsToCsv(await listTallies(env, fetch));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="back-in-stock-signups.csv"');
    res.end(csv);
  } catch {
    res.statusCode = 503;
    res.end('Sign-up export is not available yet.\n');
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
