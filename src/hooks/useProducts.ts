import { useEffect, useMemo, useState } from 'react';
import { productService, type SearchProduct } from '../services/productService';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';
import { resolveProductParam, type ProductResolution } from '../lib/productPath';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  /** True when data came from Firestore (not the static fallback) */
  fromFirestore: boolean;
}

/**
 * Supabase-backed product hook.
 *
 * Strategy:
 *   • Start EMPTY (callers show loading skeletons) — the old warm-start with
 *     the static catalogue flashed fictional demo products (and burned their
 *     Unsplash image downloads) for the first ~1s of every visit.
 *   • Once Supabase responds, **fully replace** with DB data — the merge
 *     approach caused duplicate listings with mismatched variant IDs at
 *     checkout (static sizes were 'sm'/'md'/'lg', not UUIDs).
 *   • The static catalogue is only displayed when Supabase is totally
 *     empty (e.g. first-ever boot, or offline) — a dev-only fallback.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fromSupabase, setFromSupabase] = useState(false);

  useEffect(() => {
    let didReceiveFirst = false;

    let unsub: (() => void) | undefined;

    try {
      unsub = productService.subscribe((dbProducts) => {
        if (!didReceiveFirst) {
          didReceiveFirst = true;
          setLoading(false);
        }

        if (dbProducts.length > 0) {
          // Supabase is the source of truth — all 38 products + variants
          // live there. Static catalogue is no longer mixed in (would create
          // duplicate listings + non-UUID variant ids at checkout).
          setProducts(dbProducts);
          setFromSupabase(true);
        } else {
          // Empty DB → pure static catalogue (development fallback).
          setProducts(PRODUCTS);
          setFromSupabase(false);
        }
      });
    } catch {
      // Supabase unreachable — fall back to static data silently
      setProducts(PRODUCTS);
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  return { products, loading, fromFirestore: fromSupabase };
}

/**
 * Single-product lookup for the PDP, without re-subscribing to the collection.
 *
 * Resolves the `/shop/:id` route param exactly as the server does
 * (lib/productPath.resolveProductParam): a clean slug is `found`; a legacy
 * `<slug>-<uuid>`, bare UUID or static-catalogue slug is a `redirect` to the
 * clean URL; anything else is `gone` or `not-found`. `resolution` stays
 * undefined until the catalogue has loaded.
 */
export function useProduct(id: string | undefined): {
  product: Product | undefined;
  resolution: ProductResolution<Product> | undefined;
  loading: boolean;
} {
  const { products, loading } = useProducts();
  const resolution = useMemo(
    () => (id && !loading ? resolveProductParam(id, products) : undefined),
    [id, products, loading],
  );
  const product = resolution && resolution.kind === 'found' ? resolution.product : undefined;
  return { product, resolution, loading };
}

/**
 * Lightweight product index for the header search typeahead. A one-shot lean
 * fetch (no variants / tags / secondary images) so the global Navigation — which
 * mounts on every route — no longer pulls the entire catalogue on pages that
 * only host the search box (e.g. /trade). Not realtime; a slightly stale search
 * index is fine.
 */
export function useSearchIndex(): SearchProduct[] {
  const [items, setItems] = useState<SearchProduct[]>([]);
  useEffect(() => {
    let active = true;
    productService.listSearch().then((list) => { if (active) setItems(list); });
    return () => { active = false; };
  }, []);
  return items;
}
