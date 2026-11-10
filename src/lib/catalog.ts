import type { Product } from '../types';
import type { Category, CategoryTree } from './categoryTree';

/**
 * Catalogue selection helpers — pure, shared by the SPA and the render
 * function so the homepage / category snapshot the server sends lists exactly
 * the products the SPA will show.
 */

/** Live products filed anywhere in `c`'s subtree (parent categories roll up). */
export function productsInCategory(c: Category, tree: CategoryTree, products: readonly Product[]): Product[] {
  const ids = tree.descendantIds(c.id);
  return products.filter((p) => p.categoryId && ids.has(p.categoryId));
}

const hasTag = (p: Product, slug: string) => (p.tags ?? []).some((t) => t.slug === slug);
const inStock = (p: Product) => p.sizes.some((s) => s.inStock);

/**
 * Homepage "Featured ingredients": bestsellers, then new arrivals, then
 * everything else; in-stock before sold-out; name order within each band.
 * With a small catalogue this lists every live product, which is the point:
 * every live product gets a link from the homepage.
 */
export function featuredProducts(products: readonly Product[], limit = 12): Product[] {
  const score = (p: Product) =>
    (hasTag(p, 'bestseller') ? 0 : hasTag(p, 'new-arrival') ? 1 : 2) * 2 + (inStock(p) ? 0 : 1);
  return [...products]
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Root categories shown as browse tiles (the admin gives them an image). */
export const browseCategories = (tree: CategoryTree) => tree.roots.filter((c) => c.imageUrl);

/** Intro line under a listing H1 (/shop or a category) — server + client. */
export function listingIntro(c: Category | null, count: number): string {
  if (!c) return 'Every COCO36 ingredient in one place. Filter by origin, certification and price. Ships across India.';
  if (c.description) return c.description;
  if (count === 0) return `Nothing from ${c.name} is in the shop right now.`;
  return `${count} ${count === 1 ? 'ingredient' : 'ingredients'} in ${c.name}. Ships across India.`;
}
