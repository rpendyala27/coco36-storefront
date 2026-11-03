import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseRequest, render } from '../server/render.js';

/**
 * Vercel Function behind every HTML URL on coco36.com (vercel.json rewrites
 * `/(.*)` → `/api/render?__path=$1` after static files). See server/render.ts.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname, search } = parseRequest(req.url ?? '/');
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').split(',')[0].trim().toLowerCase();
  try {
    const out = await render(pathname, search, host);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(req.method === 'HEAD' ? undefined : out.body);
  } catch (err) {
    console.error('[api/render]', pathname, err);
    res.statusCode = 500;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Something went wrong. Please try again shortly.');
  }
}
