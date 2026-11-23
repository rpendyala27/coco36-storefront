import { useEffect, useState } from 'react';
import { API_URL } from './supabase';
import { fetchStock, type Stock } from './stock';

/**
 * Live sellable units for the packs on screen (product page, /shop cards).
 * Same endpoint the cart uses. Requests made in the same tick are merged and
 * sent 50 ids at a time; answers are kept for a minute so a grid of cards
 * costs one or two calls, not one per card. Any failure leaves the pack on
 * its `in_stock` flag (see availability.ts) and the server still decides at
 * Place order.
 */
const TTL_MS = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cache = new Map<string, { n: number; at: number }>();
let maxShown = 0;
let pending = new Set<string>();
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** For tests. */
export function resetLiveStock(): void {
  cache.clear();
  pending = new Set();
  flushing = null;
  maxShown = 0;
}

function snapshot(ids: readonly string[], now = Date.now()): Stock | null {
  const available: Record<string, number> = {};
  let any = false;
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && now - hit.at < TTL_MS) { available[id] = hit.n; any = true; }
  }
  return any ? { available, maxShown } : null;
}

async function flush(fetcher: typeof fetchStock): Promise<void> {
  await Promise.resolve();
  const ids = [...pending];
  pending = new Set();
  flushing = null;
  for (let i = 0; i < ids.length; i += 50) {
    const s = await fetcher(API_URL, ids.slice(i, i + 50));
    if (!s) continue;
    maxShown = s.maxShown;
    const at = Date.now();
    for (const [id, n] of Object.entries(s.available)) cache.set(id, { n, at });
  }
  listeners.forEach((fn) => fn());
}

/** Queue ids for the next batch. Exported for tests (fetcher is injectable). */
export function requestLiveStock(ids: readonly string[], fetcher: typeof fetchStock = fetchStock): Promise<void> {
  const now = Date.now();
  for (const id of ids) {
    if (!UUID_RE.test(id)) continue;
    const hit = cache.get(id);
    if (!hit || now - hit.at >= TTL_MS) pending.add(id);
  }
  if (pending.size === 0) return Promise.resolve();
  if (!flushing) flushing = flush(fetcher);
  return flushing;
}

export function liveStockFor(ids: readonly string[]): Stock | null {
  return snapshot(ids);
}

/** Live stock for these pack ids, or null until it arrives (or if it can't). */
export function useLiveStock(ids: readonly string[]): Stock | null {
  const key = [...ids].sort().join(',');
  const [stock, setStock] = useState<Stock | null>(() => snapshot(ids));
  useEffect(() => {
    if (!key) { setStock(null); return undefined; }
    const list = key.split(',');
    const update = () => setStock(snapshot(list));
    listeners.add(update);
    update();
    void requestLiveStock(list);
    return () => { listeners.delete(update); };
  }, [key]);
  return stock;
}
