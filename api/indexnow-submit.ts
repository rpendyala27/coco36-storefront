import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorizeSubmit, submitIndexNow } from '../server/indexnow.js';

/**
 * Production-only IndexNow submit. Called after a production deploy is live
 * (GitHub Actions OIDC) or, if INDEXNOW_SUBMIT_SECRET is set, with that bearer.
 * Preview returns 404 and does not ping. IndexNow errors are logged and
 * answered 200 so a caller never treats them as a failed deployment.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed\n');
    return;
  }
  try {
    const decision = await authorizeSubmit(header(req, 'authorization'), process.env);
    if (decision !== 'ok') {
      // JSON, including the 404, so a post-deploy caller can tell this
      // function is live and stop. Nothing is submitted.
      sendJson(res, decision === 'unauthorized' ? 401 : 404, {
        pinged: false,
        reason: decision,
        status: null,
        count: 0,
      });
      return;
    }
    const result = await submitIndexNow({ env: process.env });
    sendJson(res, 200, {
      pinged: result.pinged,
      reason: result.reason,
      status: result.status ?? null,
      count: result.urls.length,
    });
  } catch (err) {
    console.error('[indexnow] submit route failed', err instanceof Error ? err.name : 'error');
    sendJson(res, 200, { pinged: false, reason: 'error', status: null, count: 0 });
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}
