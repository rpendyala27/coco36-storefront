import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categoryPath, productPath, resolveProductParam } from '../src/lib/productPath.js';
import { productsInCategory } from '../src/lib/catalog.js';
import { bakingNoteByPath } from '../src/content/bakingNotes.js';
import { WHOLESALE_GUIDE_PATH, wholesaleGuide } from '../src/content/wholesaleGuide.js';
import { RECIPES_HUB_PATH, recipeBySlug } from '../src/content/recipes.js';
import { guideBySlug } from '../src/content/guides.js';
import { categoryListingMeta } from '../src/content/categoryPages.js';
import {
  NOINDEX, categoryCrumbs, goneMeta, guideCrumbs, guidesHubMeta,
  homeMeta, notFoundMeta, productCrumbs, productMeta, shopMeta, staticPageCrumbs, staticPageMeta,
  type PageMeta,
} from '../src/seo/meta.js';
import { bakingNoteMeta } from '../src/seo/bakingNoteMeta.js';
import { recipeMeta, recipesHubMeta } from '../src/seo/recipeMeta.js';
import { guideMeta } from '../src/seo/guideMeta.js';
import { DEFAULT_POLICY, SITE_HOST, SITE_ORIGIN } from '../src/seo/site.js';
import { buildTree } from '../src/lib/categoryTree.js';
import { inject, isTemplate, renderHead } from './html.js';
import { loadCatalog, loadLotPassport, type Catalog } from './catalog.js';
import {
  bakingNoteSnapshot, categorySnapshot, errorSnapshot, guideSnapshot, guidesHubSnapshot, homeSnapshot,
  productSnapshot, recipeSnapshot, recipesHubSnapshot, shopSnapshot, staticSnapshot, type SnapshotCtx,
} from './snapshot.js';

/**
 * Every HTML request on coco36.com lands here (vercel.json rewrites /(.*) to
 * api/render). It decides the REAL HTTP status for the URL — 200, 301 to the
 * canonical URL, 404 or 410 — then serves the built SPA shell with that page's
 * <head> and a server-rendered content snapshot injected.
 *
 * This replaces the old catch-all rewrite to index.html, which answered every
 * URL (including removed products) with 200 and the homepage's metadata:
 * the source of the "soft 404" and duplicate-title reports in Search Console.
 */

export interface RenderResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// ── Template ─────────────────────────────────────────────────────────────────
// The Vite-built index.html, moved out of the public output by
// scripts/stash-template.mjs (so "/" can't be served as a static file) and
// bundled into the function via vercel.json functions.includeFiles.
let template: string | null = null;
export function loadTemplate(): string {
  if (template) return template;
  const file = join(process.cwd(), 'dist-server', 'index.html');
  const html = readFileSync(file, 'utf8');
  if (!isTemplate(html)) throw new Error(`[render] ${file} is missing the <!--seo:head--> / <!--ssr--> markers`);
  template = html;
  return html;
}
/** Test hook. */
export function setTemplate(html: string | null): void { template = html; }

// ── Cache policy ─────────────────────────────────────────────────────────────
// Vercel's CDN caches by URL and is purged on every deploy. Pages refresh from
// Supabase within ~5 minutes; stale copies are served while revalidating.
const CACHE = {
  page:     'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  redirect: 'public, max-age=3600, s-maxage=3600',
  error:    'public, max-age=0, s-maxage=60',
  noStore:  'no-store',
};

const HTML = 'text/html; charset=utf-8';

function redirect(location: string): RenderResult {
  const to = location.startsWith('http') ? location : SITE_ORIGIN + location;
  return {
    status: 301,
    headers: { Location: to, 'Cache-Control': CACHE.redirect, 'Content-Type': HTML },
    body: `<!doctype html><title>Moved</title><a href="${to.replace(/"/g, '&quot;')}">Moved permanently</a>`,
  };
}

function page(status: number, meta: PageMeta, snapshot: string, extraHeaders: Record<string, string> = {}): RenderResult {
  const headers: Record<string, string> = {
    'Content-Type': HTML,
    'Cache-Control': status === 200 ? CACHE.page : status === 503 ? CACHE.noStore : CACHE.error,
    ...extraHeaders,
  };
  // Mirror <meta name="robots"> as a header: honoured before the HTML is parsed.
  if (meta.robots) headers['X-Robots-Tag'] = meta.robots;
  return { status, headers, body: inject(loadTemplate(), renderHead(meta), snapshot) };
}

/** Snapshot context when the catalogue isn't needed (static pages). */
const emptyCtx = (): SnapshotCtx => ({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY });

/**
 * Resolve one request. `pathname` is the decoded request path (no query);
 * `search` the query string without "?"; `host` the request host.
 */
export async function render(pathname: string, search: string, host: string): Promise<RenderResult> {
  // Retired kit URL. vercel.json 301s /shop/bean-to-bar-kit (and the trailing
  // slash) to /shop at the edge, after the www → apex hop. This is the
  // backstop so a direct function hit, or the slash spelling, never answers 410.
  const bare = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (bare.toLowerCase() === '/shop/bean-to-bar-kit') return redirect('/shop');

  // One canonical host, and one spelling of the path. vercel.json redirects www
  // and strips trailing slashes first; this is the backstop so /shop/ cannot
  // be a second URL beside /shop.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return redirect(`https://${SITE_HOST}${pathname.replace(/\/+$/, '')}${search ? `?${search}` : ''}`);
  }
  if (/^www\./i.test(host)) return redirect(`https://${SITE_HOST}${pathname}${search ? `?${search}` : ''}`);

  const params = new URLSearchParams(search);
  const segs = pathname.split('/').filter(Boolean);
  // Non-production hosts (previews, *.vercel.app) must never be indexed.
  const hostHeaders: Record<string, string> = host && host !== SITE_HOST ? { 'X-Robots-Tag': 'noindex' } : {};
  const withHost = (r: RenderResult): RenderResult =>
    (hostHeaders['X-Robots-Tag'] ? { ...r, headers: { ...r.headers, ...hostHeaders } } : r);

  // Static content + utility pages. They render even if Supabase is down: the
  // catalogue only adds footer links and live shipping policy.
  if (staticPageMeta(pathname)) {
    let ctx = emptyCtx();
    try { ctx = await loadCatalog(); } catch (err) { console.error('[render] catalogue unavailable (static page)', err); }
    const meta = staticPageMeta(pathname, ctx.policy)!;
    return withHost(page(200, meta, staticSnapshot(ctx, pathname, staticPageCrumbs(pathname))));
  }

  // Ingredient Notes (/guides). Same resilience as the info pages: the copy
  // does not depend on the catalogue. /ingredients stays the family library.
  const note = bakingNoteByPath(pathname);
  if (note) {
    let ctx = emptyCtx();
    try { ctx = await loadCatalog(); } catch (err) { console.error('[render] catalogue unavailable (baking note)', err); }
    const live = note.path === WHOLESALE_GUIDE_PATH ? wholesaleGuide(ctx.policy) : note;
    return withHost(page(200, bakingNoteMeta(live), bakingNoteSnapshot(ctx, live)));
  }

  // Recipes. Copy does not depend on the catalogue. Unknown slugs fall through
  // to the 404 below once the catalogue is available.
  if (pathname === RECIPES_HUB_PATH) {
    let ctx = emptyCtx();
    try { ctx = await loadCatalog(); } catch (err) { console.error('[render] catalogue unavailable (recipes)', err); }
    return withHost(page(200, recipesHubMeta(), recipesHubSnapshot(ctx)));
  }
  if (segs[0] === 'recipes' && segs.length === 2) {
    const recipe = recipeBySlug(segs[1]);
    if (recipe) {
      let ctx = emptyCtx();
      try { ctx = await loadCatalog(); } catch (err) { console.error('[render] catalogue unavailable (recipe)', err); }
      return withHost(page(200, recipeMeta(recipe), recipeSnapshot(ctx, recipe)));
    }
  }

  // Everything else depends on the live catalogue.
  let cat: Catalog;
  try {
    cat = await loadCatalog();
  } catch (err) {
    console.error('[render] catalogue unavailable', err);
    // 503 tells crawlers "temporary, come back" instead of indexing a broken
    // page or dropping it. Visitors still get the SPA, which loads data itself.
    return withHost(page(503, { ...homeMeta(), robots: NOINDEX, path: undefined, jsonLd: [] }, '', { 'Retry-After': '120' }));
  }
  const ctx: SnapshotCtx = cat;

  // ── /
  if (pathname === '/') return withHost(page(200, homeMeta(cat.policy), homeSnapshot(ctx)));

  // ── /shop (+ legacy ?cat= / ?category= → clean category URL)
  if (pathname === '/shop') {
    const legacySlug = params.get('cat');
    const legacyName = params.get('category');
    if (legacySlug || legacyName) {
      const c = (legacySlug && cat.tree.bySlug.get(legacySlug)) || cat.tree.all.find((x) => x.name === legacyName);
      return redirect(c ? categoryPath(c) : '/shop');
    }
    // `?q=` with nothing in it is the same document as /shop. Don't leave an
    // indexable twin. A real query stays noindex and canonicalises to /shop.
    const q = params.get('q');
    if (q !== null && !q.trim()) {
      params.delete('q');
      const rest = params.toString();
      return redirect(`/shop${rest ? `?${rest}` : ''}`);
    }
    const meta = shopMeta();
    return withHost(page(200, q && q.trim() ? { ...meta, robots: NOINDEX } : meta, shopSnapshot(ctx)));
  }

  // ── /shop/category/:slug
  if (segs[0] === 'shop' && segs[1] === 'category' && segs.length === 3) {
    const c = cat.tree.bySlug.get(segs[2]);
    if (!c) return withHost(page(404, notFoundMeta(), errorSnapshot(ctx, 'not-found')));
    const items = productsInCategory(c, cat.tree, cat.products);
    return withHost(page(200, categoryListingMeta(c, cat.tree, items), categorySnapshot(ctx, c, categoryCrumbs(c, cat.tree))));
  }

  // ── /shop/:product and legacy /catalog/:product
  if ((segs[0] === 'shop' || segs[0] === 'catalog') && segs.length === 2) {
    const r = resolveProductParam(segs[1], cat.products);
    if (r.kind === 'redirect') return redirect(r.to);
    if (r.kind === 'found') {
      if (segs[0] === 'catalog') return redirect(productPath(r.product));
      const p = r.product;
      return withHost(page(200, productMeta(p, cat.tree, cat.policy), productSnapshot(ctx, p, productCrumbs(p, cat.tree))));
    }
    if (r.kind === 'gone') return withHost(page(410, goneMeta(), errorSnapshot(ctx, 'gone')));
    return withHost(page(404, notFoundMeta(), errorSnapshot(ctx, 'not-found')));
  }

  // ── /lot/:lot (lot passport): never indexed; 404 while SHOW_LOT_PASSPORT is off
  if (segs[0] === 'lot' && segs.length === 2) {
    const passport = await loadLotPassport(decodeURIComponent(segs[1]));
    if (!passport) return withHost(page(404, notFoundMeta(), errorSnapshot(ctx, 'not-found')));
    return withHost(page(200, {
      title: `Lot ${passport.lot_code} · ${passport.product.name} | COCO36`,
      description: `Where lot ${passport.lot_code} of ${passport.product.name} came from, and its certificates.`,
      robots: NOINDEX, jsonLd: [],
    }, ''));
  }

  // ── /ingredients and /ingredients/:slug
  if (pathname === '/ingredients') return withHost(page(200, guidesHubMeta(), guidesHubSnapshot(ctx)));
  if (segs[0] === 'ingredients' && segs.length === 2) {
    const g = guideBySlug(segs[1]);
    if (g) return withHost(page(200, guideMeta(g, cat.policy), guideSnapshot(ctx, g, guideCrumbs(g))));
  }

  return withHost(page(404, notFoundMeta(), errorSnapshot(ctx, 'not-found')));
}

/** Request path + query from a rewritten request (`/api/render?__path=…`). */
export function parseRequest(rawUrl: string): { pathname: string; search: string } {
  const url = new URL(rawUrl, 'http://internal');
  const fromRewrite = url.searchParams.get('__path');
  url.searchParams.delete('__path');
  // Direct hits on /api/render (no __path) are not a page.
  const pathname = fromRewrite === null ? '/api/render' : `/${fromRewrite.replace(/^\/+/, '')}`;
  return { pathname, search: url.searchParams.toString() };
}
