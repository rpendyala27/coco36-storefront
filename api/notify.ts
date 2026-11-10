import type { IncomingMessage, ServerResponse } from 'node:http';
import { clientIp, handleNotify, insertWithAnon, type NotifyEnv } from '../server/notify.js';

const store = new Map<string, number[]>();

/**
 * POST /api/notify — one back-in-stock sign-up.
 * Inserts with the anon key. If the table is not there yet, this fails
 * with a plain error and does not pretend the sign-up was saved.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  try {
    const input = await readJson(req);
    const forwarded = req.headers['x-forwarded-for'];
    const result = await handleNotify({
      input,
      ip: clientIp(Array.isArray(forwarded) ? forwarded[0] : forwarded),
      now: Date.now(),
      store,
      insert: (row) => insertWithAnon(process.env as NotifyEnv, row, fetch),
    });
    send(res, result.status, result.body);
  } catch {
    send(res, 400, { ok: false, error: 'Enter a valid email address.' });
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const asAsync = req as unknown as AsyncIterable<unknown> | undefined;
  if (!asAsync || typeof asAsync[Symbol.asyncIterator] !== 'function') return {};
  const chunks: Buffer[] = [];
  for await (const chunk of asAsync) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}
