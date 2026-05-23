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
 * Supabase-first product hook with static catalogue fallback.
 *
 * Strategy:
 *   • Warm-start with the static catalogue so the UI never flashes empty.
 *   • Subscribe to Supabase for realtime updates.
 *   • Merge results: Supabase products win on ID collision, static fills
 *     gaps for slugs not yet in the database. This means UI works smoothly
 *     during the migration period when only some products are seeded.
 *
 * `fromSupabase` is true once Supabase responds with at least one product.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts]     = useState<Product[]>(PRODUCTS); // warm start
  const [loading, setLoading]       = useState(true);
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
          // Merge: Supabase entries first, then static entries whose IDs
          // (slugs) aren't yet covered by the DB.
          const dbIds = new Set(dbProducts.map((p) => p.id));
          const merged = [
            ...dbProducts,
            ...PRODUCTS.filter((p) => !dbIds.has(p.id)),
          ];
          setProducts(merged);
          setFromSupabase(true);
        } else {
          // Empty DB → pure static catalogue.
          setProducts(PRODUCTS);
          setFromSupabase(false);
        }
      });
    } catch {
      // Supabase not configured / offline — stay on static data silently
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  return { products, loading, fromFirestore: fromSupabase };
}

/**
 * Single-product lookup. Useful in ProductDetail without re-subscribing
 * to the full collection.
 */
export function useProduct(id: string | undefined): { product: Product | undefined; loading: boolean } {
  const { products, loading } = useProducts();
  const product = id ? products.find((p) => p.id === id) : undefined;
  return { product, loading };
}
