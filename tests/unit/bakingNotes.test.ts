import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BAKING_NOTES, COUVERTURE_BUYING_GUIDE_PUBLISH_DATE, formatPublishDate } from '../../src/content/bakingNotes';
import { DESCRIPTION_MAX, TITLE_MAX, stripMarkdown } from '../../src/seo/text';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import { sitemapEntries } from '../../server/sitemap';
import { buildTree } from '../../src/lib/categoryTree';
import { DEFAULT_POLICY } from '../../src/seo/site';

/**
 * Ingredient Notes (/guides). The family library at /ingredients is a
 * different route and must stay 200.
 */

const RETARGETED = [
  '/shop/indian-dark-couverture',
  '/shop/category/couverture',
  '/shop/dutch-process-cocoa-powder',
  '/shop/pistachio-paste',
];

const decode = (s: string) => s
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

const titleOf = (html: string) => decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '');
const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const visible = (html: string) => decode(
  html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
);
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]) as { '@type'?: string });

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('ingredient notes', () => {
  it('each route is 200 with one h1, the draft title, and a self canonical', async () => {
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      expect(r.status, note.path).toBe(200);
      expect(titleOf(r.body), note.path).toBe(note.title);
      expect(canonicalOf(r.body), note.path).toBe(`https://coco36.com${note.path}`);
      expect(r.body.match(/<h1[\s>]/g)?.length, note.path).toBe(1);
      expect(r.body, note.path).toContain(`<h1>${note.h1}</h1>`);
      const desc = r.body.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
      expect(decode(desc), note.path).toBe(note.description);
    }
  });

  it('JSON-LD parses, and FAQ answers match the visible text', async () => {
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      const blocks = jsonLd(r.body);
      expect(blocks.length, note.path).toBeGreaterThan(0);
      const types = blocks.map((b) => b['@type']);
      expect(types, note.path).toContain('Article');
      expect(types, note.path).toContain('BreadcrumbList');
      const article = blocks.find((b) => b['@type'] === 'Article') as { headline?: string; description?: string };
      expect(article.headline, note.path).toBe(note.h1);
      expect(article.description, note.path).toBe(note.schemaDescription);
      if (note.faqs.length) {
        expect(types, note.path).toContain('FAQPage');
        const faq = blocks.find((b) => b['@type'] === 'FAQPage') as {
          mainEntity: { name: string; acceptedAnswer: { text: string } }[];
        };
        const text = visible(r.body);
        expect(faq.mainEntity.map((q) => q.name)).toEqual(note.faqs.map((f) => f.q));
        expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(note.faqs.map((f) => stripMarkdown(f.a)));
        for (const f of note.faqs) {
          expect(text, f.q).toContain(f.q);
          expect(text, f.q).toContain(stripMarkdown(f.a));
        }
      } else {
        expect(types, note.path).not.toContain('FAQPage');
      }
    }
  });

  it('the pistachio recipe JSON-LD parses and does not restate removed trial lines', async () => {
    const r = await render('/guides/pistachio-paste-dubai-chocolate-at-home', '', 'coco36.com');
    const recipe = jsonLd(r.body).find((b) => b['@type'] === 'Recipe') as {
      recipeIngredient?: string[];
      description?: string;
      recipeInstructions?: { text?: string }[];
    };
    expect(recipe).toBeTruthy();
    const blob = JSON.stringify(recipe);
    expect(blob).not.toContain('[CONFIRM');
    expect(blob).not.toContain('trial-confirmed');
    expect(blob).not.toContain('Confirm weights');
    expect(blob).not.toContain('Confirm timings');
    expect(recipe.recipeIngredient?.join(' ')).not.toMatch(/cooking fat/i);
    expect(recipe.description).toContain('unsweetened pistachio-paste');
    expect(recipe.description).not.toMatch(/100%/);
  });

  it('published HTML has no [CONFIRM], Shiprocket, Visakhapatnam, or Vizag', async () => {
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      expect(r.body, note.path).not.toContain('[CONFIRM');
      expect(r.body, note.path).not.toMatch(/Shiprocket/i);
      expect(r.body, note.path).not.toMatch(/Visakhapatnam/);
      expect(r.body, note.path).not.toMatch(/Vizag/);
    }
  });

  it('published HTML has no FSSAI licence, repack, hero SKU, or India-stock claims', async () => {
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      expect(r.body, note.path).not.toContain('FSSAI repack');
      expect(r.body, note.path).not.toMatch(/FSSAI licen[cs]e/i);
      expect(r.body, note.path).not.toContain('hero SKU');
      expect(r.body, note.path).not.toContain('India-stock');
      expect(r.body, note.path).not.toMatch(/\bours is better\b/i);
    }
  });

  it('guide titles and descriptions stay inside the site limits', () => {
    for (const note of BAKING_NOTES) {
      expect(note.title.length, note.title).toBeLessThanOrEqual(TITLE_MAX);
      expect(note.description.length, note.path).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it('the sitemap lists every note and still lists the ingredient library', () => {
    const paths = sitemapEntries({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY }).map((e) => e.path);
    for (const note of BAKING_NOTES) expect(paths, note.path).toContain(note.path);
    expect(paths).toContain('/ingredients');
    expect(paths).toContain('/ingredients/vanilla');
    expect(paths).toContain('/ingredients/cocoa-chocolate');
    for (const missing of RETARGETED) expect(paths, missing).not.toContain(missing);
  });

  it('keeps /ingredients, links the library from /guides, and sends unpublished product paths to /shop', async () => {
    const library = await render('/ingredients', '', 'coco36.com');
    expect(library.status).toBe(200);
    expect(library.body).toContain('<h1>Know your ingredients</h1>');
    expect(canonicalOf(library.body)).toBe('https://coco36.com/ingredients');

    const hub = await render('/guides', '', 'coco36.com');
    for (const slug of ['vanilla', 'cocoa-chocolate', 'sugars-jaggery', 'flours', 'spices-salt']) {
      expect(hub.body, slug).toContain(`href="/ingredients/${slug}"`);
      expect((await render(`/ingredients/${slug}`, '', 'coco36.com')).status, slug).toBe(200);
    }

    const hrefs = new Set<string>();
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      expect(r.body, note.path).toContain('href="/guides"');
      const ssr = r.body.split('<div class="ssr">')[1] ?? '';
      for (const href of ssr.matchAll(/href="(\/[^"]*)"/g)) hrefs.add(href[1]);
    }
    for (const missing of RETARGETED) expect(hrefs, missing).not.toContain(missing);
    expect(hrefs).toContain('/shop');
    for (const href of hrefs) {
      const status = (await render(href, '', 'coco36.com')).status;
      expect(status, href).toBe(200);
    }
  });

  it('keeps the pistachio URL and publishes the repositioned title, meta and article', async () => {
    const path = '/guides/pistachio-paste-dubai-chocolate-at-home';
    const r = await render(path, '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(canonicalOf(r.body)).toBe(`https://coco36.com${path}`);
    expect(titleOf(r.body)).toBe('Pistachio Paste for Baking, Gelato & Mithai | COCO36');
    const desc = decode(r.body.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
    expect(desc).toBe('Pistachio paste vs cream for Indian bakers: unsweetened paste for gelato, frangipane, entremets and mithai — and how to read the label.');
    expect(decode(r.body.match(/property="og:title" content="([^"]*)"/)?.[1] ?? '')).toBe('Pistachio Paste for Baking, Gelato & Mithai | COCO36');
    expect(decode(r.body.match(/property="og:description" content="([^"]*)"/)?.[1] ?? '')).toBe(desc);
    const article = jsonLd(r.body).find((b) => b['@type'] === 'Article') as {
      headline?: string; description?: string; mainEntityOfPage?: string;
    };
    expect(article.headline).toBe('Pistachio paste for baking, gelato, viennoiserie and mithai');
    expect(article.description).toBe('Pistachio paste vs cream for Indian bakers: unsweetened paste for gelato, frangipane, entremets and mithai, and how to read the label.');
    expect(article.mainEntityOfPage).toBe(`https://coco36.com${path}`);
    for (const url of [
      'https://www.tastetomorrow.com/inspiration/after-72-percent-growth-the-past-year-where-does-pistachio-go-now',
      'https://www.agri-pulse.com/articles/24950-dubai-chocolate-craze-helps-pistachios-defy-tree-nut-downturn',
      'https://www.callebaut.com/en/products/callebaut/nuts-pure-pistachio-paste/NPO-PI1-2B-18A',
      'https://shop.pisti.it/en/products/pistachio-spreadable-cream-in-premium-pack',
      'https://www.callebaut.com/en/recipes/dubai-bar/4898',
      'https://www.callebaut.com/en/recipes/yesims-dubai-chocolate-bar/4942',
    ]) expect(r.body, url).toContain(url);
  });

  it('puts the answer-first sentence first and keeps the previous opening sentence second', async () => {
    const cases = [
      {
        path: '/guides',
        first: 'These guides help Indian bakers choose couverture versus compound chocolate, natural (non-alkalised) versus Dutch-process cocoa',
        second: 'Short, practical notes from COCO36 for bakers and pastry cooks across India',
      },
      {
        path: '/guides/couverture-vs-compound',
        first: 'Couverture is cocoa-butter-rich chocolate; compound uses a different principal fat',
        second: 'Walk into any bakery supplier in India',
      },
      {
        path: '/guides/natural-vs-dutch-cocoa',
        first: 'Natural (non-alkalised) cocoa is more acidic; Dutch-process (alkalised) cocoa has reduced acidity',
        second: 'Cocoa powder looks simple: a brown pouch next to the maida.',
        later: 'Dark colour doesn’t tell you everything.',
      },
      {
        path: '/guides/pistachio-paste-dubai-chocolate-at-home',
        first: 'Pistachio paste should be unsweetened ground pistachios',
        second: 'This guide is for home bakers, pastry cooks, gelato makers and mithai kitchens',
        later: 'Pistachio paste is coming soon to the COCO36 shop, and it will not be sold as cream.',
      },
    ];
    for (const c of cases) {
      const text = visible((await render(c.path, '', 'coco36.com')).body);
      const iFirst = text.indexOf(c.first);
      const iSecond = text.indexOf(c.second);
      expect(iFirst, c.path).toBeGreaterThan(-1);
      expect(iSecond, c.path).toBeGreaterThan(iFirst);
      if (c.later) expect(text.indexOf(c.later), c.path).toBeGreaterThan(iSecond);
    }
    const hub = visible((await render('/guides', '', 'coco36.com')).body);
    expect(hub).toContain('Pistachio paste for baking, gelato, viennoiserie and mithai');
    expect(hub).toContain('Unsweetened paste versus sweetened cream — for gelato, frangipane, entremets and mithai, with a Dubai-style bar as one method.');
    expect(hub).toContain('The writing stays crop-to-craft.');
  });

  it('publishes the couverture buying guide, its sitemap entry, and the placeholder date', async () => {
    const path = '/guides/best-couverture-chocolate-india';
    const note = BAKING_NOTES.find((n) => n.path === path);
    expect(note?.published).toBe(COUVERTURE_BUYING_GUIDE_PUBLISH_DATE);
    const r = await render(path, '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(titleOf(r.body)).toBe('Best Couverture Chocolate in India (2027) | COCO36');
    expect(canonicalOf(r.body)).toBe(`https://coco36.com${path}`);
    expect(r.body.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(decode(r.body.match(/property="og:title" content="([^"]*)"/)?.[1] ?? '')).toBe(note!.title);
    expect(decode(r.body.match(/property="og:description" content="([^"]*)"/)?.[1] ?? '')).toBe(note!.description);
    expect(r.body).toContain('property="og:type" content="article"');
    const blocks = jsonLd(r.body);
    const types = blocks.map((b) => b['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
    expect(types).not.toContain('Review');
    expect(types).not.toContain('AggregateRating');
    const article = blocks.find((b) => b['@type'] === 'Article') as {
      headline?: string; description?: string; datePublished?: string; mainEntityOfPage?: string;
    };
    expect(article.headline).toBe(note!.h1);
    expect(article.description).toBe(note!.description);
    expect(article.datePublished).toBe(COUVERTURE_BUYING_GUIDE_PUBLISH_DATE);
    expect(article.mainEntityOfPage).toBe(`https://coco36.com${path}`);
    const text = visible(r.body);
    expect(text).toContain(`Published ${formatPublishDate(COUVERTURE_BUYING_GUIDE_PUBLISH_DATE)}`);
    expect(r.body).toContain(`datetime="${COUVERTURE_BUYING_GUIDE_PUBLISH_DATE}"`);
    expect(r.body).toContain('href="/guides/couverture-vs-compound"');
    expect(text).toContain('coming soon to the COCO36 shop');
    expect(text).toContain('FSSAI couverture standard');
    expect(text).toContain('not claiming that our forthcoming chocolate is better');
    expect(text).not.toMatch(/₹/);
    expect(text).not.toMatch(/Visakhapatnam|Vizag/);
    const urls = new Set<string>();
    const walk = (value: unknown) => {
      if (typeof value === 'string') {
        for (const m of value.matchAll(/https?:\/\/[^)\s]+/g)) urls.add(m[0]);
      } else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(note);
    expect(urls.size).toBeGreaterThanOrEqual(22);
    expect(urls.has('https://www.fssai.gov.in/upload/uploadfiles/files/Gazette_Notification_Chocolate_Standards_01_06_2017.pdf')).toBe(true);
    expect(urls.has('https://www.amul.com/index.php?q=products%2Famul-dark-compound-dco-18-info.php')).toBe(true);
    for (const url of urls) expect(r.body, url).toContain(url);

    const paths = sitemapEntries({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY }).map((e) => e.path);
    expect(paths).toContain(path);
    expect(paths.filter((p) => p === path)).toHaveLength(1);
    expect(paths).not.toContain('/cart');
    expect(paths).toContain('/recipes');
    expect(paths).not.toContain('/shop/bean-to-bar-kit');
  });
});
