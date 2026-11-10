import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorizeSubmit, parseIndexNowState, submitIndexNow } from '../server/indexnow.js';

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
    const payload = await readJson(req);
    const result = await submitIndexNow({
      env: process.env,
      previous: parseIndexNowState(payload.previous),
      force: payload.force === true,
    });
    sendJson(res, 200, {
      pinged: result.pinged,
      reason: result.reason,
      status: result.status ?? null,
      count: result.urls.length,
      nextState: result.nextState,
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

async function readJson(req: IncomingMessage): Promise<{ previous?: unknown; force?: unknown }> {
  const asAsync = req as unknown as AsyncIterable<unknown> | undefined;
  if (!asAsync || typeof asAsync[Symbol.asyncIterator] !== 'function') return {};
  const chunks: Buffer[] = [];
  for await (const chunk of asAsync) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed as { previous?: unknown; force?: unknown };
}
