import type { Product } from '../types';
import { COMING_SOON_SLUG, OUT_OF_STOCK_SLUG, displayBadgeLabel } from './badges';

/**
 * Browse tiles from designation tags on live products.
 *
 * `coming-soon` is left off: that status has its own row. `out-of-stock` is
 * the status pill, not a collection. Sold-out products still count — every
 * live variant is currently out of stock, and a tile is a tag, not a promise
 * that the pack can be bought today.
 */

const TILE_LABELS: Record<string, string> = {
  bestseller: 'Bestsellers',
  'new-arrival': 'New arrivals',
};

const TILE_RANK = ['bestseller', 'new-arrival', 'limited-edition'];

const EXCLUDED = new Set([COMING_SOON_SLUG, OUT_OF_STOCK_SLUG]);

export interface DesignationTile {
  slug: string;
  label: string;
  image: string;
}

export function designationBrowseTiles(products: readonly Product[]): DesignationTile[] {
  const seen = new Map<string, DesignationTile>();
  for (const product of products) {
    if (!product.image) continue;
    for (const tag of product.tags ?? []) {
      if (tag.kind !== 'designation' || EXCLUDED.has(tag.slug) || seen.has(tag.slug)) continue;
      const label = TILE_LABELS[tag.slug] ?? displayBadgeLabel(tag.label);
      if (!label) continue;
      seen.set(tag.slug, { slug: tag.slug, label, image: product.image });
    }
  }
  const rank = (slug: string) => {
    const i = TILE_RANK.indexOf(slug);
    return i === -1 ? TILE_RANK.length : i;
  };
  return [...seen.values()].sort((a, b) => rank(a.slug) - rank(b.slug) || a.label.localeCompare(b.label));
}
