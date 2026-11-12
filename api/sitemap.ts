import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadCatalog } from '../server/catalog.js';
import { reportServerException, withSentry } from '../server/sentry.js';
import { sitemapXml } from '../server/sitemap.js';

/** /sitemap.xml (vercel.json rewrite) — built from the live catalogue. */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const xml = sitemapXml(await loadCatalog());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.end(req.method === 'HEAD' ? undefined : xml);
  } catch (err) {
    // Never serve a partial sitemap: a 503 makes Google retry later.
    console.error('[api/sitemap]', err);
    await reportServerException(err);
    res.statusCode = 503;
    res.setHeader('Retry-After', '300');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Sitemap temporarily unavailable.');
  }
}

export default withSentry(handler);
