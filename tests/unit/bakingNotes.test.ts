import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BAKING_NOTES } from '../../src/content/bakingNotes';
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

const UNRESOLVED = [
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
    expect(recipe.description).toContain('100% pistachio-paste');
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

  it('the sitemap lists all four notes and still lists the ingredient library', () => {
    const paths = sitemapEntries({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY }).map((e) => e.path);
    for (const note of BAKING_NOTES) expect(paths, note.path).toContain(note.path);
    expect(paths).toContain('/ingredients');
    expect(paths).toContain('/ingredients/vanilla');
    expect(paths).toContain('/ingredients/cocoa-chocolate');
    for (const missing of UNRESOLVED) expect(paths, missing).not.toContain(missing);
  });

  it('keeps /ingredients, links the library from /guides, and reports placeholder routes that 404', async () => {
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
    for (const missing of UNRESOLVED) expect(hrefs, missing).toContain(missing);
    for (const href of hrefs) {
      const status = (await render(href, '', 'coco36.com')).status;
      if (UNRESOLVED.includes(href)) expect(status, href).toBe(404);
      else expect(status, href).toBe(200);
    }
  });
});
