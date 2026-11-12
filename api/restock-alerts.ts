import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorizeJob } from '../server/notify.js';
import { restockEmailEnabled, restockFrom, runRestock } from '../server/restock.js';
import { sendResend } from '../server/resendMail.js';
import { reportServerException, withSentry } from '../server/sentry.js';
import {
  claimSignup, listStock, listUnsent, lookupAuthEmail, markSignupSent, releaseSignup,
  serviceCredentials, type ServiceEnv,
} from '../server/notifyStore.js';
import { SITE_ORIGIN } from '../src/seo/site.js';

/**
 * POST /api/restock-alerts — send the one back-in-stock email per sign-up.
 * Same secret as the CSV export. The flag defaults off, so calling this
 * from a preview (or after merge, until the owner sets the env) sends nothing.
 */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ sent: 0, reason: 'method' }));
    return;
  }
  const env = process.env as ServiceEnv & { RESTOCK_EMAIL_ENABLED?: string; RESTOCK_EMAIL_FROM?: string; RESEND_API_KEY?: string };
  const auth = await authorizeJob(header(req, 'authorization'), env, (jwt) => lookupAuthEmail(env, jwt, fetch));
  if (auth === 'unconfigured') {
    res.statusCode = 404;
    res.end(JSON.stringify({ sent: 0, reason: 'unconfigured' }));
    return;
  }
  if (auth !== 'ok') {
    res.statusCode = 401;
    res.end(JSON.stringify({ sent: 0, reason: 'unauthorized' }));
    return;
  }
  if (!restockEmailEnabled(env)) {
    res.statusCode = 200;
    res.end(JSON.stringify({ sent: 0, reason: 'disabled' }));
    return;
  }
  const apiKey = env.RESEND_API_KEY?.trim() || '';
  if (!apiKey || !serviceCredentials(env)) {
    res.statusCode = 200;
    res.end(JSON.stringify({ sent: 0, reason: 'missing-key' }));
    return;
  }
  try {
    const result = await runRestock({
      enabled: true,
      from: restockFrom(env),
      origin: SITE_ORIGIN,
      listUnsent: () => listUnsent(env, fetch),
      listProducts: () => listStock(env, fetch),
      claim: (id) => claimSignup(env, id, fetch),
      release: (id) => releaseSignup(env, id, fetch),
      markSent: (id, messageId) => markSignupSent(env, id, messageId, fetch),
      send: (mail) => sendResend(apiKey, mail, fetch),
    });
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (err) {
    await reportServerException(err);
    res.statusCode = 503;
    res.end(JSON.stringify({ sent: 0, reason: 'unavailable' }));
  }
}

export default withSentry(handler);

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
