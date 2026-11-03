import type { Product } from '../types';
import type { CategoryTree } from '../lib/categoryTree';

/**
 * Lightweight index of the ingredient guides: just what links, cards and
 * product↔guide matching need. Kept separate from the guide BODIES
 * (content/guides.ts) so site-wide UI (nav, footer, home, PDP) doesn't ship
 * every guide's full text in the main bundle.
 */

export interface GuideLink {
  slug: string;
  /** Short family name for nav, cards and breadcrumbs. */
  name: string;
  /** One-line card blurb for the hub / homepage. */
  blurb: string;
  /** Which live products belong here: category subtree(s) OR a name keyword. */
  match: { categorySlugs: string[]; keywords: string[] };
  /** Category page to send "browse all" clicks to, when it has live products. */
  shopCategorySlug?: string;
}

export const GUIDE_LINKS: GuideLink[] = [
  {
    slug: 'vanilla',
    name: 'Vanilla',
    blurb: 'Tahitian vs Bourbon, how curing builds flavour, and how to use every pod.',
    match: { categorySlugs: [], keywords: ['vanilla'] },
    shopCategorySlug: 'extracts-flavors',
  },
  {
    slug: 'cocoa-chocolate',
    name: 'Cocoa & chocolate',
    blurb: 'Natural vs Dutch-process cocoa, what couverture means, and tempering basics.',
    match: { categorySlugs: ['cocoa-chocolate'], keywords: ['cocoa', 'cacao', 'chocolate', 'couverture'] },
    shopCategorySlug: 'cocoa-chocolate',
  },
  {
    slug: 'sugars-jaggery',
    name: 'Sugars & jaggery',
    blurb: 'How jaggery and muscovado are made, and where each one works best.',
    match: { categorySlugs: ['sugars-sweeteners'], keywords: ['jaggery', 'muscovado'] },
    shopCategorySlug: 'sugars-sweeteners',
  },
  {
    slug: 'flours',
    name: 'Flours',
    blurb: 'Protein and gluten, buckwheat (kuttu), rye, spelt, and storing flour well.',
    match: { categorySlugs: ['flours-grains'], keywords: ['flour', 'sourdough'] },
    shopCategorySlug: 'flours-grains',
  },
  {
    slug: 'spices-salt',
    name: 'Spices & salt',
    blurb: 'Flaky finishing salt, true cinnamon vs cassia, and keeping spices fresh.',
    match: { categorySlugs: [], keywords: ['salt', 'spice', 'cinnamon', 'cardamom', 'saffron', 'pepper', 'tonka', 'clove', 'nutmeg'] },
    shopCategorySlug: 'spices-pantry',
  },
];

export const GUIDES_HUB = {
  path: '/ingredients',
  title: 'Ingredient Guides for Bakers & Pastry Chefs | COCO36',
  description: 'Guides to vanilla, cocoa and chocolate, sugars and jaggery, speciality flours, spices and salt: origins, how to use and store them, and common questions.',
  eyebrow: 'Ingredient guides',
  h1: 'Know your ingredients',
  intro: 'Each guide explains where an ingredient comes from, how it is made, how to use and store it, and answers the questions bakers ask us most. Every guide links to the matching products in the shop.',
} as const;

export const guidePath = (g: { slug: string }) => `/ingredients/${g.slug}`;

/** Live products that belong to a guide (category subtree OR name keyword). */
export function productsForGuide(g: GuideLink, products: readonly Product[], tree: CategoryTree): Product[] {
  const catIds = new Set<string>();
  for (const slug of g.match.categorySlugs) {
    const c = tree.bySlug.get(slug);
    if (c) tree.descendantIds(c.id).forEach((id) => catIds.add(id));
  }
  const kw = g.match.keywords.map((k) => k.toLowerCase());
  return products.filter((p) =>
    (p.categoryId && catIds.has(p.categoryId)) || kw.some((k) => p.name.toLowerCase().includes(k)));
}
