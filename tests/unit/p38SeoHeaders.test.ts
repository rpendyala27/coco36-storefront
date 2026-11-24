import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveProductParam } from '../../src/lib/productPath';
import { buildTree, type Category } from '../../src/lib/categoryTree';
import { browseCategories, stockedRootCategories } from '../../src/lib/catalog';
import { sitemapEntries } from '../../server/sitemap';
import { renderConsentDefault } from '../../server/gaSnippet';
import { ogImageFor } from '../../src/seo/meta';
import { DEFAULT_OG_IMAGE, DEFAULT_POLICY } from '../../src/seo/site';
import { policyBlurb, refundLine } from '../../src/content/orderFacts';
import { infoPage } from '../../src/content/infoPages';
import { HERO_VIDEO_PHASE, PHASE_POSTERS, PHASE_VIDEOS } from '../../src/data/phaseVideos';
import type { Product } from '../../src/types';

const vercel = JSON.parse(readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const siteHeaders = vercel.headers.find((h) => h.source === '/(.*)')!.headers;
const header = (key: string) => siteHeaders.find((h) => h.key === key)?.value;

describe('P38 security headers (F61)', () => {
  it('ships CSP in report-only mode, not enforced', () => {
    expect(header('Content-Security-Policy-Report-Only')).toBeTruthy();
    expect(header('Content-Security-Policy')).toBeUndefined();
  });

  it('allows the inline consent stub by hash, not by unsafe-inline', () => {
    const csp = header('Content-Security-Policy-Report-Only')!;
    const script = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '))!;
    expect(script).not.toContain("'unsafe-inline'");
    const stub = renderConsentDefault();
    const body = stub.slice(stub.indexOf('<script>') + '<script>'.length, stub.lastIndexOf('</script>'));
    const hash = createHash('sha256').update(body, 'utf8').digest('base64');
    expect(script).toContain(`'sha256-${hash}'`);
  });

  it('keeps the checkout, analytics and data hosts the site needs', () => {
    const csp = header('Content-Security-Policy-Report-Only')!;
    for (const host of ['https://checkout.razorpay.com', 'https://api.razorpay.com', 'https://admin.coco36.com',
      'https://www.googletagmanager.com', 'https://res.cloudinary.com', 'https://videos.pexels.com']) {
      expect(csp, host).toContain(host);
    }
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  it('adds Permissions-Policy and keeps the existing headers', () => {
    const pp = header('Permissions-Policy')!;
    expect(pp).toContain('camera=()');
    expect(pp).toContain('geolocation=()');
    expect(pp).toMatch(/payment=\(self [^)]*razorpay/);
    expect(header('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});

const live = (name: string, id = name) => ({ id, name });

describe('P38 retired slugs (F20)', () => {
  it('muscovado-cane-sugar 301s to dark muscovado when it is live', () => {
    const r = resolveProductParam('muscovado-cane-sugar', [live('Dark Muscovado Cane Sugar')]);
    expect(r).toMatchObject({ kind: 'redirect', to: '/shop/dark-muscovado-cane-sugar' });
  });

  it('muscovado-cane-sugar is 410 when no real equivalent is live', () => {
    expect(resolveProductParam('muscovado-cane-sugar', [live('Tahitian Vanilla Beans')]).kind).toBe('gone');
  });

  it('the old static slug goes straight to the live equivalent, no chain', () => {
    const r = resolveProductParam('muscovado-sugar', [live('Dark Muscovado Cane Sugar')]);
    expect(r).toMatchObject({ kind: 'redirect', to: '/shop/dark-muscovado-cane-sugar' });
  });

  it('keeps the bean-to-bar-kit 301 to /shop (#45)', () => {
    expect(resolveProductParam('bean-to-bar-kit', [])).toEqual({ kind: 'redirect', to: '/shop' });
  });

  it('a live product with that slug is still served', () => {
    const p = live('Muscovado Cane Sugar');
    expect(resolveProductParam('muscovado-cane-sugar', [p])).toEqual({ kind: 'found', product: p });
  });
});

const cat = (id: string, name: string, parentId: string | null = null, imageUrl: string | null = 'https://res.cloudinary.com/x/image/upload/v1/c.jpg'): Category =>
  ({ id, slug: name.toLowerCase().replace(/\W+/g, '-'), name, parentId, sortOrder: 0, imageUrl, description: null });
const prod = (id: string, categoryId: string) => ({ id, name: id, categoryId, sizes: [], tags: [] }) as unknown as Product;

describe('P38 empty categories (F21)', () => {
  const tree = buildTree([
    cat('vanilla', 'Vanilla'),
    cat('beans', 'Vanilla Beans', 'vanilla'),
    cat('flours', 'Flours'),
    cat('salts', 'Salts', null, null),
  ]);
  const products = [prod('tahitian', 'beans'), prod('salt', 'salts')];

  it('hides roots with no live product from the nav', () => {
    expect(stockedRootCategories(tree, products).map((c) => c.id)).toEqual(['vanilla', 'salts']);
  });

  it('browse tiles need a live product and an image', () => {
    expect(browseCategories(tree, products).map((c) => c.id)).toEqual(['vanilla']);
    expect(browseCategories(tree, [])).toEqual([]);
  });

  it('the sitemap omits empty categories', () => {
    const paths = sitemapEntries({ products, tree, policy: DEFAULT_POLICY } as never).map((e) => e.path);
    expect(paths).toContain('/shop/category/vanilla');
    expect(paths).toContain('/shop/category/vanilla-beans');
    expect(paths).not.toContain('/shop/category/flours');
  });
});

describe('P38 OG image (F08, F64)', () => {
  it('never uses an Unsplash seed photo as the share image', () => {
    expect(ogImageFor({ title: 't', description: 'd', image: 'https://images.unsplash.com/photo-1?w=1200' } as never)).toBe(DEFAULT_OG_IMAGE);
  });
  it('keeps a Cloudinary image', () => {
    const img = 'https://res.cloudinary.com/doee8wtag/image/upload/v1/x.jpg';
    expect(ogImageFor({ title: 't', description: 'd', image: img } as never)).toBe(img);
  });
});

describe('P38 policy copy (F24, F65)', () => {
  const noCod = /cash.on.delivery|\bCOD\b/i;
  it('refund and returns copy make no cash-on-delivery promise', () => {
    expect(policyBlurb(DEFAULT_POLICY)).not.toMatch(noCod);
    expect(refundLine()).not.toMatch(noCod);
    for (const p of ['/returns', '/shipping', '/faq']) {
      const text = JSON.stringify(infoPage(p)!.sections(DEFAULT_POLICY));
      expect(text, p).not.toMatch(noCod);
    }
  });
  it('the Terms page uses the shared tracking line', () => {
    const terms = readFileSync(path.resolve(__dirname, '../../src/pages/Terms.tsx'), 'utf8');
    expect(terms).not.toMatch(noCod);
    expect(terms).not.toContain('AWB is assigned');
    expect(terms).toContain('trackingLine()');
  });
});

describe('P38 hero video (F66)', () => {
  it('names exactly one phase with a clip and a poster', () => {
    expect(PHASE_VIDEOS[HERO_VIDEO_PHASE]).toMatch(/^https:\/\/videos\.pexels\.com\//);
    expect(PHASE_POSTERS[HERO_VIDEO_PHASE]).toMatch(/^\/hero-posters\//);
  });
});
