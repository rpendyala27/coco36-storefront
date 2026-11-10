import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatPublishDate } from '../../src/content/bakingNotes';
import {
  RECIPES, RECIPES_HUB, RECIPES_PUBLISH_DATE, RECIPES_PUBLISH_LABEL, RECIPE_INDEX_LINKS,
  schemaIngredients,
} from '../../src/content/recipes';
import { DESCRIPTION_MAX, TITLE_MAX, stripMarkdown } from '../../src/seo/text';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import { filterIndexNowUrls } from '../../server/indexnow';
import { sitemapEntries } from '../../server/sitemap';
import { buildTree } from '../../src/lib/categoryTree';
import { DEFAULT_POLICY, SITE_ORIGIN } from '../../src/seo/site';

/**
 * Recipes batch 1. The Christmas guide is a separate page and is only linked
 * where this batch's copy asks for it.
 */

const decode = (s: string) => s
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

const titleOf = (html: string) => decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '');
const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const robotsOf = (html: string) => html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;
const visible = (html: string) => decode(
  html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
);
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]) as Record<string, unknown>);

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('recipes batch 1', () => {
  it('publishes the index without noindex, with the draft intro and the three links', async () => {
    expect(RECIPES_HUB.title.length).toBe(43);
    expect(RECIPES_HUB.description.length).toBe(147);
    expect(RECIPES_HUB.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(RECIPES_HUB.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(RECIPES_PUBLISH_LABEL).toBe(formatPublishDate(RECIPES_PUBLISH_DATE));

    const r = await render('/recipes', '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(robotsOf(r.body)).toBeNull();
    expect(r.headers['X-Robots-Tag']).toBeUndefined();
    expect(titleOf(r.body)).toBe(RECIPES_HUB.title);
    expect(canonicalOf(r.body)).toBe(`${SITE_ORIGIN}/recipes`);
    expect(r.body.match(/<h1[\s>]/g)?.length).toBe(1);
    const text = visible(r.body);
    expect(text).toContain(RECIPES_HUB.h1);
    expect(text).toContain('These recipes are written in metric weights for home bakers in India');
    expect(text).toContain('not a claim that COCO36 has tested every batch');
    expect(text).toContain('coming soon to the COCO36 shop');
    for (const link of RECIPE_INDEX_LINKS) {
      expect(r.body).toContain(`href="${link.href}"`);
      expect(text).toContain(link.label);
    }
    expect(r.body).not.toContain('href="/guides/christmas-chocolate-baking"');
    expect(r.body).not.toContain('dark-muscovado');
    const types = jsonLd(r.body).map((block) => block['@type']);
    expect(types).toContain('BreadcrumbList');
    expect(types).not.toContain('Recipe');
    expect(text).not.toMatch(/Visakhapatnam|Vizag/);
    expect(text).not.toMatch(/₹|FSSAI|repack/i);
  });

  it('publishes each recipe with matching Recipe JSON-LD and no image', async () => {
    const christmas = new Set(['/recipes/fudgy-dutch-cocoa-brownies', '/recipes/dark-couverture-ganache']);
    for (const recipe of RECIPES) {
      expect(recipe.title.length, recipe.title).toBeLessThanOrEqual(TITLE_MAX);
      expect(recipe.description.length, recipe.path).toBeLessThanOrEqual(DESCRIPTION_MAX);
      const r = await render(recipe.path, '', 'coco36.com');
      expect(r.status, recipe.path).toBe(200);
      expect(robotsOf(r.body), recipe.path).toBeNull();
      expect(r.headers['X-Robots-Tag'], recipe.path).toBeUndefined();
      expect(titleOf(r.body)).toBe(recipe.title);
      expect(canonicalOf(r.body)).toBe(`${SITE_ORIGIN}${recipe.path}`);
      expect(r.body.match(/<h1[\s>]/g)?.length).toBe(1);
      const text = visible(r.body);
      expect(text).toContain(recipe.h1);
      expect(text).toContain(recipe.opening);
      expect(text).toContain(`Published ${RECIPES_PUBLISH_LABEL}`);
      for (const fact of recipe.facts) expect(text, fact.label).toContain(`${fact.label}: ${fact.value}`);
      for (const group of recipe.groups) {
        expect(text).toContain(group.heading);
        for (const item of group.items) expect(text, item).toContain(item);
      }
      for (const step of recipe.steps) expect(text, step).toContain(stripMarkdown(step));
      for (const tip of recipe.tips) expect(text).toContain(stripMarkdown(tip));
      for (const link of recipe.related) {
        expect(r.body, link.href).toContain(`href="${link.href}"`);
        expect(text).toContain(link.label);
        if (link.suffix) expect(text).toContain(link.suffix.trim());
      }
      if (christmas.has(recipe.path)) expect(r.body).toContain('href="/guides/christmas-chocolate-baking"');
      else expect(r.body).not.toContain('href="/guides/christmas-chocolate-baking"');

      const blocks = jsonLd(r.body);
      const types = blocks.map((block) => block['@type']);
      expect(types).toContain('Recipe');
      expect(types).toContain('BreadcrumbList');
      expect(types).not.toContain('Review');
      expect(types).not.toContain('AggregateRating');
      expect(types).not.toContain('NutritionInformation');
      const data = blocks.find((block) => block['@type'] === 'Recipe')!;
      expect(data.name).toBe(recipe.h1);
      expect(data.description).toBe(recipe.description);
      expect(data).not.toHaveProperty('image');
      expect(data).not.toHaveProperty('nutrition');
      expect(data).not.toHaveProperty('aggregateRating');
      expect(data).not.toHaveProperty('review');
      expect(data).not.toHaveProperty('recipeCuisine');
      expect(data.author).toEqual({ '@type': 'Organization', name: 'COCO36', url: `${SITE_ORIGIN}/` });
      expect(data.datePublished).toBe(RECIPES_PUBLISH_DATE);
      expect(data.prepTime).toBe(recipe.prepTime);
      expect(data.cookTime).toBe(recipe.cookTime);
      expect(data.totalTime).toBe(recipe.totalTime);
      expect(data.recipeCategory).toBe('Dessert');
      expect(data.recipeYield).toEqual(recipe.recipeYield.length === 1 ? recipe.recipeYield[0] : recipe.recipeYield);
      expect(data.recipeIngredient).toEqual(schemaIngredients(recipe).map((item) => stripMarkdown(item)));
      expect(data.recipeInstructions).toEqual(recipe.steps.map((step) => ({ '@type': 'HowToStep', text: stripMarkdown(step) })));
      expect(data.url).toBe(`${SITE_ORIGIN}${recipe.path}`);
      expect(data.mainEntityOfPage).toBe(`${SITE_ORIGIN}${recipe.path}`);
      const crumbs = blocks.find((block) => block['@type'] === 'BreadcrumbList') as {
        itemListElement: { name: string; item: string }[];
      };
      expect(crumbs.itemListElement.map((item) => item.item)).toEqual([
        `${SITE_ORIGIN}/`,
        `${SITE_ORIGIN}/recipes`,
        `${SITE_ORIGIN}${recipe.path}`,
      ]);
      expect(text).not.toMatch(/Visakhapatnam|Vizag/);
      expect(text).not.toMatch(/₹/);
      expect(text).not.toMatch(/FSSAI/);
      expect(text).not.toMatch(/repack/i);
      expect(text).not.toMatch(/\b100%\b/);
      expect(text).not.toMatch(/\bpure\b/i);
    }
  });

  it('keeps the 1:1 ganache and the pastry shell out of Recipe JSON-LD', async () => {
    const ganache = await render('/recipes/dark-couverture-ganache', '', 'coco36.com');
    const ganacheLd = jsonLd(ganache.body).find((block) => block['@type'] === 'Recipe')!;
    const ganacheIngredients = ganacheLd.recipeIngredient as string[];
    expect(visible(ganache.body)).toContain('200 g fresh cream');
    expect(ganacheIngredients).toContain('100 g fresh cream');
    expect(ganacheIngredients).not.toContain('200 g fresh cream');
    expect(ganacheIngredients).toContain('15 g unsalted butter, at room temperature (optional, for a slightly softer set)');
    expect(ganacheIngredients).not.toContain('15 g unsalted butter, optional');

    const pistachio = await render('/recipes/pistachio-frangipane', '', 'coco36.com');
    const pistachioLd = jsonLd(pistachio.body).find((block) => block['@type'] === 'Recipe')!;
    const pistachioIngredients = pistachioLd.recipeIngredient as string[];
    expect(visible(pistachio.body)).toContain('22 cm tart shell');
    expect(pistachioIngredients.join(' ')).not.toMatch(/tart shell|croissant/i);
    expect(pistachioLd.cookTime).toBe('PT30M');
    expect(visible(pistachio.body)).toContain('15 minutes for filled croissants');
  });

  it('lists the index and the three recipes in the sitemap, and IndexNow will submit them', () => {
    const paths = sitemapEntries({ products: [], tree: buildTree([]), policy: DEFAULT_POLICY }).map((entry) => entry.path);
    for (const path of ['/recipes', ...RECIPES.map((recipe) => recipe.path)]) {
      expect(paths.filter((entry) => entry === path), path).toEqual([path]);
    }
    expect(paths).not.toContain('/cart');
    expect(paths).not.toContain('/shop/bean-to-bar-kit');
    expect(filterIndexNowUrls([
      'https://coco36.com/recipes',
      ...RECIPES.map((recipe) => `https://coco36.com${recipe.path}`),
      'https://coco36.com/cart',
      'https://coco36.com/shop/bean-to-bar-kit',
    ])).toEqual([
      'https://coco36.com/recipes',
      ...RECIPES.map((recipe) => `https://coco36.com${recipe.path}`),
    ]);
  });

  it('unknown recipe slugs are a real 404', async () => {
    const r = await render('/recipes/not-a-recipe', '', 'coco36.com');
    expect(r.status).toBe(404);
    expect(robotsOf(r.body)).toBe('noindex');
  });
});
