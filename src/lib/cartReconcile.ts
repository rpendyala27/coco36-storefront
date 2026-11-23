import type { CartItem } from '../types';

/**
 * Archived or deleted packs in a saved cart (F18). The anon read of
 * `product_variants` only returns packs whose product is active and not
 * deleted (P31 `public_read_variants`), so a cart pack id missing from that
 * read is no longer sold: drop the line and tell the shopper.
 *
 * Only real variant UUIDs are checked (older catalogue ids have their own
 * notice). When the read fails, nothing is dropped.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cartVariantIds(items: readonly CartItem[]): string[] {
  return [...new Set(items.map((i) => i.sizeId).filter((id) => UUID_RE.test(id)))].sort();
}

export function splitArchived(
  items: readonly CartItem[],
  liveIds: ReadonlySet<string> | null,
): { keep: CartItem[]; removed: CartItem[] } {
  if (!liveIds) return { keep: [...items], removed: [] };
  const keep: CartItem[] = [];
  const removed: CartItem[] = [];
  for (const item of items) {
    if (UUID_RE.test(item.sizeId) && !liveIds.has(item.sizeId)) removed.push(item);
    else keep.push(item);
  }
  return { keep, removed };
}

/** "Muscovado Cane Sugar (250 g Light) is no longer sold, so we took it out of your bag." */
export function removedLinesNotice(removed: readonly CartItem[]): string | null {
  if (!removed.length) return null;
  const names = removed.map((i) => `${i.name} (${i.sizeLabel})`);
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list} ${removed.length === 1 ? 'is' : 'are'} no longer sold, so we took ${removed.length === 1 ? 'it' : 'them'} out of your bag.`;
}

/** Type of the anon read, so it can be swapped in tests. */
export type LiveVariantReader = (ids: string[]) => Promise<Set<string> | null>;
