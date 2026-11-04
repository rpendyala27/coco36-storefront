import type { CartItem } from '../types';

/**
 * Cart stock cap. Counts come from the admin `GET /api/public/availability`
 * (variant_sellable_qty, the same number place_order checks), capped at
 * `maxShown` so exact inventory is never public: `maxShown` means "that many
 * or more". The server still decides at Place order; this only stops the cart
 * promising units that aren't there.
 *
 * Pure helpers here; the fetch is a thin wrapper. All money in paise.
 */
export interface Stock {
  /** variant id → sellable units (0 = sold out). Missing id = not known yet. */
  available: Record<string, number>;
  maxShown: number;
}

/** Below this many units the cart says "Only N left". */
export const LOW_STOCK = 5;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sellable units for a pack, or undefined when not known (not fetched, legacy id). */
export function availableFor(stock: Stock | null, sizeId: string): number | undefined {
  const n = stock?.available[sizeId];
  return typeof n === 'number' ? n : undefined;
}

/** Quantity the cart may hold. Unknown stock leaves it alone. */
export function clampQty(qty: number, available: number | undefined): number {
  return available === undefined ? qty : Math.min(qty, available);
}

/** Units of a line that can actually be bought. */
export function sellableQty(item: CartItem, stock: Stock | null): number {
  return Math.max(0, clampQty(item.quantity, availableFor(stock, item.sizeId)));
}

/** Subtotal of sellable units only, so the free-shipping banner never counts stock that isn't there. */
export function sellableSubtotal(items: CartItem[], stock: Stock | null): number {
  return items.reduce((sum, i) => sum + sellableQty(i, stock) * i.unitPriceInPaise, 0);
}

/** Lines with no sellable units. */
export function soldOutItems(items: CartItem[], stock: Stock | null): CartItem[] {
  return items.filter((i) => availableFor(stock, i.sizeId) === 0);
}

/**
 * The note under a cart line: "Sold out", "Only N left", or null.
 * "Only N left" shows when stock is low, or when the line is at the cap
 * (and the cap is an exact count, i.e. below maxShown).
 */
export function stockNote(stock: Stock | null, sizeId: string, qty: number): string | null {
  const n = availableFor(stock, sizeId);
  if (n === undefined || !stock) return null;
  if (n === 0) return 'Sold out';
  if (n < stock.maxShown && (n <= LOW_STOCK || qty >= n)) return `Only ${n} left`;
  return null;
}

/** Ids worth asking about: real variant UUIDs only, de-duplicated, sorted (stable cache key). */
export function stockIds(items: CartItem[]): string[] {
  return [...new Set(items.map((i) => i.sizeId).filter((id) => UUID_RE.test(id)))].sort();
}

/** Parse the endpoint's JSON; anything malformed is null (no cap rather than a wrong cap). */
export function parseStock(d: unknown): Stock | null {
  if (!d || typeof d !== 'object') return null;
  const { available, maxShown } = d as { available?: unknown; maxShown?: unknown };
  if (!available || typeof available !== 'object' || typeof maxShown !== 'number') return null;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(available as Record<string, unknown>)) {
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[id] = Math.floor(n);
  }
  return { available: out, maxShown };
}

/** GET /api/public/availability. Null on any failure: the cart then stays uncapped and the server decides. */
export async function fetchStock(apiUrl: string, ids: string[]): Promise<Stock | null> {
  if (ids.length === 0) return { available: {}, maxShown: 0 };
  try {
    const r = await fetch(`${apiUrl}/api/public/availability?variants=${ids.slice(0, 50).join(',')}`);
    return r.ok ? parseStock(await r.json()) : null;
  } catch {
    return null;
  }
}
