import { useEffect, useState } from 'react';
import { productService } from '../services/productService';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';

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
 * Single-product lookup. Useful in ProductDetail without re-subscribing
 * to the full collection.
 *
 * Matches:
 *   1. Direct UUID/id match — primary path for Supabase products.
 *   2. Slug fallback — turns "india-trinitario-couverture" into a name
 *      match so legacy bookmarks/URLs from the static catalogue era keep
 *      resolving without a DB migration.
 */
export function useProduct(id: string | undefined): { product: Product | undefined; loading: boolean } {
  const { products, loading } = useProducts();

  const product = id
    ? products.find((p) => p.id === id) ?? products.find((p) => slugify(p.name) === id)
    : undefined;

  return { product, loading };
}

/** Lowercase, hyphenated, alphanumeric-only — matches the static catalogue slug style. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // any non-alphanum → hyphen
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
}
