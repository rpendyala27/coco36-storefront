import type { Product, ProductTag } from '../types';

/**
 * Storefront copy for the admin "Out of Stock" designation. The tag label in
 * the admin may be "Out of Stock"; the pill on the shop always reads this.
 */
export const OUT_OF_STOCK_PILL = 'Out of stock';

const KEY = 'outofstock';

/** Letters and digits only, so `out-of-stock`, `out_of_stock` and "Out of Stock" match. */
function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isDesignation(kind: string | undefined): boolean {
  return (kind ?? '').toLowerCase() === 'designation';
}

/**
 * A designation-kind tag the admin ticks under Tags → Designations.
 * Matched the same way as Bestseller / New Arrival (slug), and also by label
 * so a renamed slug still counts when the label is "Out of Stock".
 */
export function isOutOfStockDesignation(
  tag: Partial<Pick<ProductTag, 'slug' | 'label' | 'kind'>>,
): boolean {
  if (tag.kind != null && !isDesignation(tag.kind)) return false;
  return compact(tag.slug ?? '') === KEY || compact(tag.label ?? '') === KEY;
}

/** True when this product's designation tags (or warm-start `badges`) include Out of Stock. */
export function hasOutOfStockDesignation(product: Pick<Product, 'tags' | 'badges'>): boolean {
  const tags = product.tags ?? [];
  if (tags.length > 0) {
    return tags.some((t) => isDesignation(t.kind) && isOutOfStockDesignation(t));
  }
  return (product.badges ?? []).some((label) => isOutOfStockDesignation({ label }));
}

/** No variant is `in_stock`. An empty size list is not treated as sold out. */
export function productIsOutOfStock(product: Pick<Product, 'sizes'>): boolean {
  return product.sizes.length > 0 && product.sizes.every((size) => !size.inStock);
}

/**
 * The pill shows only when the designation is ticked AND every variant is
 * actually out of stock. An in-stock product never wears it, even if the
 * checkbox is on.
 */
export function showOutOfStockPill(product: Pick<Product, 'tags' | 'badges' | 'sizes'>): boolean {
  return hasOutOfStockDesignation(product) && productIsOutOfStock(product);
}
