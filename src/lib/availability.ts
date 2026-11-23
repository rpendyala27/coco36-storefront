import { COMING_SOON_SLUG } from './badges.js';
import { availableFor, type Stock } from './stock.js';

/**
 * One availability answer for a pack (R13). The product page buttons, /shop
 * cards, Quick order, the server-rendered snapshot, JSON-LD and Notify me all
 * ask this module, so they can no longer disagree (F16, F63).
 *
 * Inputs, in order:
 *  1. Coming soon: a product tagged with the `coming-soon` designation is never
 *     buyable, whatever its packs say. Notify me takes the place of Add to bag.
 *  2. Live sellable units, when known: the admin `GET /api/public/availability`
 *     (variant_sellable_qty, the same number place_order checks). 0 = sold out.
 *  3. Otherwise the pack's `in_stock` flag.
 *
 * The server render has no live counts, so it passes no stock and falls back
 * to `in_stock`. The browser adds live counts once they arrive.
 */
export type Availability = 'available' | 'coming_soon' | 'sold_out';

type TagLike = { slug: string; kind: string };
type SizeLike = { id: string; inStock: boolean };
type ProductLike = { tags?: readonly TagLike[]; sizes: readonly SizeLike[] };

export function isComingSoon(product: { tags?: readonly TagLike[] }): boolean {
  return (product.tags ?? []).some((t) => t.kind === 'designation' && t.slug === COMING_SOON_SLUG);
}

/** The state of one pack. */
export function sizeAvailability(product: ProductLike, size: SizeLike, stock: Stock | null = null): Availability {
  if (isComingSoon(product)) return 'coming_soon';
  if (!size.inStock) return 'sold_out';
  return availableFor(stock, size.id) === 0 ? 'sold_out' : 'available';
}

/** A pack that can go in the bag right now. */
export function canBuy(product: ProductLike, size: SizeLike | undefined, stock: Stock | null = null): boolean {
  return Boolean(size) && sizeAvailability(product, size!, stock) === 'available';
}

/** Packs that can go in the bag, in display order. */
export function buyableSizes<P extends ProductLike>(product: P, stock: Stock | null = null): P['sizes'][number][] {
  return product.sizes.filter((s) => canBuy(product, s, stock));
}

/**
 * The product as a whole. Coming soon wins; sold out only when every pack is
 * sold out. A product with no packs is not called sold out (nothing to sell
 * yet, and the page shows no buy buttons anyway).
 */
export function productAvailability(product: ProductLike, stock: Stock | null = null): Availability {
  if (isComingSoon(product)) return 'coming_soon';
  if (product.sizes.length > 0 && product.sizes.every((s) => sizeAvailability(product, s, stock) === 'sold_out')) {
    return 'sold_out';
  }
  return 'available';
}

/**
 * Every pack is out, ignoring the coming-soon tag. Drives the image wash,
 * which stays on a sold-out product even when Coming Soon replaces the pill.
 */
export function allPacksOut(product: ProductLike, stock: Stock | null = null): boolean {
  return productAvailability({ sizes: product.sizes }, stock) === 'sold_out';
}

/** Words for the server-rendered snapshot and screen readers. */
export const AVAILABILITY_TEXT: Record<Availability, string> = {
  available: 'in stock',
  coming_soon: 'coming soon',
  sold_out: 'out of stock',
};

/**
 * schema.org availability. Coming soon is not orderable, so it is not InStock
 * and not PreOrder (there is no pre-order): OutOfStock is the honest value.
 */
export function schemaAvailability(a: Availability): 'https://schema.org/InStock' | 'https://schema.org/OutOfStock' {
  return a === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}
