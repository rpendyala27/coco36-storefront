import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types';
import { PRODUCT_SELECT, mapSupabaseProduct } from './productMapper';
import { applyClaims, claimsFromRows, type Claims } from '../lib/claims';

/** Which certification badges are backed by a valid certificate today; null if unknown (badges are then hidden). */
async function loadClaims(): Promise<Claims | null> {
  const { data, error } = await supabase.rpc('product_claims');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[productService.claims]', error);
    return null;
  }
  return claimsFromRows(data as { product_id: string; claim: string }[]);
}

/**
 * Supabase product reader for the storefront.
 *
 * Maps the relational schema (products + variants + images + categories + tags)
 * down into the flat Product shape the Vite UI expects.
 *
 * Taxonomy is now data-driven: the product carries its `categoryId` (the real
 * filter key — the storefront rolls filtering up over the category subtree) and
 * every tag carries its `kind`, so filter groups + badges derive from the data
 * instead of hardcoded slug lists.
 *
 * Pricing is paise end-to-end — no conversion happens here.
 */

/** Minimal product shape for the header search typeahead — no variants, images
 *  (beyond the primary), tags or descriptions. Full Product is assignable to it. */
export interface SearchProduct {
  id:       string;
  name:     string;
  brand:    string;
  origin:   string;
  category: string;
  /** Immediate category + all ancestor names, so a parent-category word
   *  ("cocoa") matches a product filed under a child ("Chocolate"). Present
   *  only on the lean index; full Product falls back to `category`. */
  categoryText?: string;
  image:    string;
}

// Lean select for search — drops variants, tags, descriptions and secondary
// images, the bulk of the full catalogue payload that the search never reads.
const SEARCH_SELECT = `
  id, name, brand, origin_country, origin_region,
  category:categories(id, name),
  images:product_images(url, is_primary, sort_order)
`;

export const productService = {
  /**
   * Subscribes to active products with realtime updates.
   * Returns an unsubscribe function — matches the old Firestore signature
   * so `useProducts` works unchanged.
   */
  subscribe(callback: (products: Product[]) => void): () => void {
    // No credentials: report "empty catalogue" once so useProducts drops to the
    // static demo data, and skip the realtime channel — an unconfigured client
    // would otherwise sit in a websocket reconnect loop against a dead host.
    if (!isSupabaseConfigured) {
      callback([]);
      return () => {};
    }

    // Initial fetch
    void (async () => {
      const list = await productService.list();
      callback(list);
    })();

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    function refetch() {
      // Debounce — coalesces multi-row updates into one refetch
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(async () => {
        const list = await productService.list();
        callback(list);
      }, 200);
    }

    // Realtime channel — refetches on any product/variant/image OR taxonomy
    // change (categories / tags / product_tags) so admin edits reflect live.
    // Unique topic per subscription. supabase.channel() returns the existing
    // channel for a reused topic and removeChannel() is async, so a re-run
    // (React 19 StrictMode double-invoke, or multiple subscribers) could get
    // back an already-subscribed channel and throw when .on() is chained onto
    // it. A fresh topic each time guarantees a new channel, .on() stays pre-subscribe.
    const channel = supabase
      .channel(`public:products:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },         () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' },  () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' },     () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' },         () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' },               () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_tags' },       () => refetch())
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      void supabase.removeChannel(channel);
    };
  },

  /** One-shot fetch — used by SSR-like flows or manual refresh. */
  async list(): Promise<Product[]> {
    if (!isSupabaseConfigured) return [];
    const [{ data, error }, claims] = await Promise.all([
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name')
        .order('id'),
      loadClaims(),
    ]);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[productService.list]', error);
      return [];
    }

    return applyClaims((data ?? []).map(mapSupabaseProduct), claims);
  },

  /** Lean one-shot fetch for the header search index (see SearchProduct).
   *  Also pulls the (tiny) categories table to roll each product's category up
   *  its ancestry, so parent-category words are searchable. */
  async listSearch(): Promise<SearchProduct[]> {
    if (!isSupabaseConfigured) return [];
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select(SEARCH_SELECT).eq('status', 'active').is('deleted_at', null).order('name').order('id'),
      supabase.from('categories').select('id, name, parent_id').is('deleted_at', null),
    ]);

    if (prodRes.error) {
      // eslint-disable-next-line no-console
      console.error('[productService.listSearch]', prodRes.error);
      return [];
    }

    // id → {name, parentId}; walk parents to build "child … root" search text.
    const cats = new Map<string, { name: string; parentId: string | null }>(
      (catRes.data ?? []).map((c: any) => [c.id, { name: c.name, parentId: c.parent_id }]),
    );
    const categoryPath = (id: string | undefined): string => {
      const names: string[] = [];
      const seen = new Set<string>();
      let cur = id;
      while (cur && cats.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        const c = cats.get(cur)!;
        names.push(c.name);
        cur = c.parentId ?? undefined;
      }
      return names.join(' ');
    };

    return (prodRes.data ?? []).map((row: any) => {
      const images = (row.images ?? []).slice().sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      const primary = images.find((i: any) => i.is_primary) ?? images[0];
      return {
        id:           row.id,
        name:         row.name,
        brand:        row.brand ?? '',
        origin:       [row.origin_country, row.origin_region].filter(Boolean).join(' · '),
        category:     row.category?.name ?? '',
        categoryText: categoryPath(row.category?.id),
        image:        primary?.url ?? '',
      };
    });
  },

  /** Lookup a single product by id (UUID). */
  async get(id: string): Promise<Product | null> {
    if (!isSupabaseConfigured) return null;
    const [{ data, error }, claims] = await Promise.all([
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle(),
      loadClaims(),
    ]);

    if (error || !data) return null;
    return applyClaims([mapSupabaseProduct(data)], claims)[0];
  },
};
