import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BAKING_NOTES, BEST_COUVERTURE_INDIA_PUBLISH_DATE, formatGuideDate } from '../../src/content/bakingNotes';
import { stripMarkdown } from '../../src/seo/text';
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

  it('published HTML has no FSSAI licence, repack, hero SKU, or India-stock', async () => {
    for (const note of BAKING_NOTES) {
      const r = await render(note.path, '', 'coco36.com');
      expect(r.body, note.path).not.toContain('FSSAI repack');
      expect(r.body, note.path).not.toContain('hero SKU');
      expect(r.body, note.path).not.toContain('India-stock');
      expect(r.body, note.path).not.toMatch(/FSSAI[-\s]?(licen[cs]e|licensed|registration|registered|logo|mark)/i);
      expect(r.body, note.path).not.toMatch(/\bours is better\b/i);
      expect(r.body, note.path).not.toMatch(/aggregateRating|reviewCount/);
    }
  });

  it('the sitemap lists every note, including the couverture buying guide, and still lists the ingredient library', () => {
    const entries = sitemapEntries({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY });
    const paths = entries.map((e) => e.path);
    for (const note of BAKING_NOTES) expect(paths, note.path).toContain(note.path);
    expect(paths).toContain('/guides/best-couverture-chocolate-india');
    expect(paths).toContain('/guides/pistachio-paste-dubai-chocolate-at-home');
    const buying = entries.find((e) => e.path === '/guides/best-couverture-chocolate-india');
    expect(buying?.lastmod).toBe(BEST_COUVERTURE_INDIA_PUBLISH_DATE);
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
    expect(hrefs).toContain('/guides/best-couverture-chocolate-india');
    for (const href of hrefs) {
      const status = (await render(href, '', 'coco36.com')).status;
      expect(status, href).toBe(200);
    }
  });

  it('puts the answer-first sentence ahead of the previous opening sentence', async () => {
    const cases = [
      ['/guides', 'These guides help Indian bakers choose couverture versus compound chocolate', 'Short, practical notes from COCO36'],
      ['/guides/couverture-vs-compound', 'Couverture is cocoa-butter-rich chocolate; compound uses a different principal fat', 'Walk into any bakery supplier in India'],
      ['/guides/natural-vs-dutch-cocoa', 'Natural (non-alkalised) cocoa is more acidic; Dutch-process (alkalised) cocoa has reduced acidity', 'Cocoa powder looks simple: a brown pouch next to the maida.'],
      ['/guides/pistachio-paste-dubai-chocolate-at-home', 'Pistachio paste should be unsweetened ground pistachios', 'This guide is for home bakers, pastry cooks, gelato makers and mithai kitchens'],
    ] as const;
    for (const [path, first, second] of cases) {
      const text = visible((await render(path, '', 'coco36.com')).body);
      expect(text.indexOf(first), path).toBeGreaterThan(-1);
      expect(text.indexOf(first), path).toBeLessThan(text.indexOf(second));
    }
    const cocoa = visible((await render('/guides/natural-vs-dutch-cocoa', '', 'coco36.com')).body);
    expect(cocoa.indexOf('Natural (non-alkalised) cocoa is more acidic')).toBeLessThan(cocoa.indexOf('Dark colour doesn’t tell you everything.'));
  });

  it('keeps the pistachio URL and serves the repositioned title, card, and canonical', async () => {
    const path = '/guides/pistachio-paste-dubai-chocolate-at-home';
    const r = await render(path, '', 'coco36.com');
    expect(canonicalOf(r.body)).toBe(`https://coco36.com${path}`);
    expect(titleOf(r.body)).toBe('Pistachio Paste for Baking, Gelato & Mithai | COCO36');
    expect(r.body).toContain('<h1>Pistachio paste for baking, gelato, viennoiserie and mithai</h1>');
    expect(r.body).toContain('property="og:title" content="Pistachio Paste for Baking, Gelato &amp; Mithai | COCO36"');
    expect(r.body).toContain('Unsweetened paste in gelato');
    expect(r.body).toContain('Mithai and familiar Indian sweets');
    expect(r.body).not.toContain('The viral bar');
    const hub = visible((await render('/guides', '', 'coco36.com')).body);
    expect(hub).toContain('Pistachio paste for baking, gelato, viennoiserie and mithai');
    expect(hub).toContain('with a Dubai-style bar as one method');
  });

  it('publishes the couverture buying guide from one date constant, with its sources', async () => {
    const path = '/guides/best-couverture-chocolate-india';
    const note = BAKING_NOTES.find((n) => n.path === path);
    expect(note?.published).toBe(BEST_COUVERTURE_INDIA_PUBLISH_DATE);
    expect(note?.updated).toBe(BEST_COUVERTURE_INDIA_PUBLISH_DATE);
    expect(BEST_COUVERTURE_INDIA_PUBLISH_DATE).toBe('2099-01-01');
    const r = await render(path, '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(titleOf(r.body)).toBe('Best Couverture Chocolate in India (2027) | COCO36');
    expect(canonicalOf(r.body)).toBe(`https://coco36.com${path}`);
    expect(r.body).toContain(`property="og:url" content="https://coco36.com${path}"`);
    expect(r.body).toContain('<h1>Best couverture chocolate brands in India (2027 buying guide)</h1>');
    expect(visible(r.body)).toContain(`Published ${formatGuideDate(BEST_COUVERTURE_INDIA_PUBLISH_DATE)}`);
    expect(r.body).toContain(`datetime="${BEST_COUVERTURE_INDIA_PUBLISH_DATE}"`);
    expect(r.body).toContain('href="/guides/couverture-vs-compound"');
    expect(r.body).toContain('coming soon to the COCO36 shop');
    expect(visible(r.body)).not.toMatch(/₹|\bINR\b|\bRs\.?\s*\d/);
    expect(r.body).toContain('not claiming that our forthcoming chocolate is better');
    expect(r.body).toContain('FSSAI couverture standard');
    const article = jsonLd(r.body).find((b) => b['@type'] === 'Article') as { headline?: string; datePublished?: string; description?: string };
    expect(article.headline).toBe(note?.h1);
    expect(article.datePublished).toBe(BEST_COUVERTURE_INDIA_PUBLISH_DATE);
    expect(article.description).toBe(note?.schemaDescription);
    for (const other of BAKING_NOTES.filter((n) => n.path !== path)) {
      const blocks = jsonLd((await render(other.path, '', 'coco36.com')).body);
      const otherArticle = blocks.find((b) => b['@type'] === 'Article') as { datePublished?: string };
      expect(otherArticle.datePublished, other.path).toBeUndefined();
    }
    const sources = [
      'https://www.fssai.gov.in/upload/uploadfiles/files/Gazette_Notification_Chocolate_Standards_01_06_2017.pdf',
      'https://www.fssai.gov.in/upload/uploadfiles/files/Clarification_Chocolate_19_02_2020.pdf',
      'https://www.callebaut.com/en-IN/products/selection-range-chocolates/callebaut-811-belgian-dark-couverture-chocolate',
      'https://www.callebaut.com/en/products/selection-range-chocolates/callebaut-823-belgian-milk-couverture-chocolate',
      'https://www.vanhoutenprofessional.com/en-IN/products/van-houten-professional/Van%20Houten%20Professional%2055%25%20Dark%20Chocolate/CHD-Q90561IN-V-67B',
      'https://www.callebaut.com/en/products/cacao-barry/dark-couverture-excellence-55-pistols/CHD-R55EXEL-2B-U77',
      'https://www.callebaut.com/en-IN/products/cacao-barry/milk-couverture--alunga-41--pistols--5kg-bag/CHM-Q41ALUN-E4-U72',
      'https://www.valrhona.com/en/our-products/for-professionals/chocolate-co/couverture-chocolates/exceptional-blends/guanaja-70',
      'https://www.bakerykart.com/products/chocolates/couverture',
      'https://www.bakerykart.com/brands/valrhona',
      'https://www.belcolade.com/en-gb/products/chocolate/selection/belcolade-selection-noir-cacao-trace',
      'https://www.puratos.in/en/chocolate/categories/real-belgian-chocolate',
      'https://www.puratos.in/en/products/belcolade-couverture_dark_1',
      'https://www.morde.com/',
      'https://www.masonchocolate.com/product-page/75-couverture-dark-baking-chocolate',
      'https://cocoatrait.com/product-category/shop/baking-couverture-chocolate/',
      'https://cocoatrait.com/product/kocoatrait-70-organic-bean-to-bar-single-origin-couverture-200gms/',
      'https://www.paulandmike.co/pages/faqs',
      'https://www.paulandmike.co/collections/all-products',
      'https://amul.com/index.php?q=products/amul-dark-chocolate-dch-47-info.php',
      'https://www.amul.com/index.php?q=products%2Famul-dark-compound-dco-18-info.php',
      'https://www.cntraveller.in/story/indian-chocolate-brands-to-know/',
    ];
    for (const url of sources) expect(r.body, url).toContain(url);
  });
});
