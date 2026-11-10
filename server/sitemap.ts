import { categoryPath, productPath } from '../src/lib/productPath.js';
import { productsInCategory } from '../src/lib/catalog.js';
import { BAKING_NOTES } from '../src/content/bakingNotes.js';
import { GUIDES, GUIDES_HUB, guidePath } from '../src/content/guides.js';
import { SITE_ORIGIN } from '../src/seo/site.js';
import { esc } from './html.js';
import type { Catalog } from './catalog.js';

/**
 * sitemap.xml, generated per request from the live catalogue (CDN-cached for
 * an hour). Lists only URLs we want indexed and that answer 200:
 *   - home, /shop, category pages that have at least one live product
 *   - every live product (status='active', deleted_at null) at its clean URL
 *   - ingredient guides + hub (/ingredients), the Ingredient Notes (/guides),
 *     and the real content pages
 * Left out on purpose: archived/deleted products, empty categories, /recipes
 * (noindex stub), /cart (real page, noindex — the bag is not a landing page),
 * and utility pages (/auth, /quick-order, /checkout, /account, /track).
 * /privacy, /terms and the info pages (/about, /contact, /faq, /shipping,
 * /returns) are included.
 */

interface Entry { path: string; changefreq: string; priority: number; lastmod?: string }

const CONTENT_PAGES: Entry[] = [
  { path: '/36-steps',     changefreq: 'monthly', priority: 0.5 },
  { path: '/partnerships', changefreq: 'monthly', priority: 0.5 },
  { path: '/trade',        changefreq: 'monthly', priority: 0.5 },
  { path: '/impact',       changefreq: 'monthly', priority: 0.4 },
  { path: '/about',        changefreq: 'monthly', priority: 0.5 },
  { path: '/contact',      changefreq: 'yearly',  priority: 0.4 },
  { path: '/faq',          changefreq: 'monthly', priority: 0.5 },
  { path: '/shipping',     changefreq: 'monthly', priority: 0.5 },
  { path: '/returns',      changefreq: 'monthly', priority: 0.5 },
  { path: '/privacy',      changefreq: 'yearly',  priority: 0.3 },
  { path: '/terms',        changefreq: 'yearly',  priority: 0.4 },
];

export function sitemapEntries(cat: Catalog): Entry[] {
  const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : undefined);
  const newest = cat.products.reduce<string | undefined>((m, p) => (p.updatedAt && (!m || p.updatedAt > m) ? p.updatedAt : m), undefined);
  const seen = new Set<string>();
  const unique = (e: Entry) => (seen.has(e.path) ? false : (seen.add(e.path), true));

  return [
    { path: '/',     changefreq: 'daily', priority: 1.0, lastmod: day(newest) },
    { path: '/shop', changefreq: 'daily', priority: 0.9, lastmod: day(newest) },
    ...cat.tree.all
      .filter((c) => productsInCategory(c, cat.tree, cat.products).length > 0)
      .map((c) => ({ path: categoryPath(c), changefreq: 'weekly', priority: 0.8 })),
    ...cat.products.map((p) => ({ path: productPath(p), changefreq: 'weekly', priority: 0.8, lastmod: day(p.updatedAt) })),
    { path: GUIDES_HUB.path, changefreq: 'monthly', priority: 0.6 },
    ...GUIDES.map((g) => ({ path: guidePath(g), changefreq: 'monthly', priority: 0.7 })),
    ...BAKING_NOTES.map((n) => ({
      path: n.path,
      changefreq: 'monthly',
      priority: n.path === '/guides' ? 0.6 : 0.7,
      lastmod: n.updated,
    })),
    ...CONTENT_PAGES,
  ].filter(unique);
}

export function sitemapXml(cat: Catalog): string {
  const urls = sitemapEntries(cat).map((e) =>
    `  <url><loc>${esc(SITE_ORIGIN + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}<changefreq>${e.changefreq}</changefreq><priority>${e.priority.toFixed(1)}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
