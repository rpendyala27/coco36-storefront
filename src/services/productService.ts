import { supabase } from '../lib/supabase';
import { Product, ProductCategory } from '../types';

/**
 * Supabase product reader for the storefront.
 *
 * Maps the relational schema (products + variants + images + categories)
 * down into the flat Product shape the Vite UI expects.
 *
 * Pricing is paise end-to-end — both Supabase and the storefront agree
 * on `selling_price_paise` as the canonical money type. No conversion
 * happens here.
 */

/** Supabase row → Vite Product shape. */
function mapSupabaseProduct(row: any): Product {
  const images = (row.images ?? []).slice().sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const primary = images.find((i: any) => i.is_primary) ?? images[0];
  const hover   = images.find((i: any) => !i.is_primary) ?? images[1];

  const variants = (row.variants ?? []).slice().sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  return {
    id:       row.id,
    sku:      row.sku ?? '',
    name:     row.name,
    brand:    row.brand ?? '',
    origin:   [row.origin_country, row.origin_region].filter(Boolean).join(' · '),
    tag:      row.tag_line ?? '',
    image:    primary?.url ?? '',
    imageHover: hover?.url,
    category: (row.category?.name ?? 'Cocoa & Chocolate') as ProductCategory,
    description: row.description_md ?? '',
    badges:   [], // future: derive from product_tags
    sizes: variants.map((v: any) => ({
      id:           v.id,                  // = variant_id, used at checkout
      label:        v.size_label,
      priceInPaise: v.selling_price_paise, // canonical money type
      inStock:      v.in_stock ?? true,
    })),
    rating:      undefined,
    reviewCount: undefined,
  };
}

export const productService = {
  /**
   * Subscribes to active products with realtime updates.
   * Returns an unsubscribe function — matches the old Firestore signature
   * so `useProducts` works unchanged.
   */
  subscribe(callback: (products: Product[]) => void): () => void {
    // Initial fetch
    void (async () => {
      const list = await productService.list();
      callback(list);
    })();

    // Realtime channel — refetches on any product/variant/image change
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },        () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' },   () => refetch())
      .subscribe();

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    function refetch() {
      // Debounce — coalesces multi-row updates into one refetch
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(async () => {
        const list = await productService.list();
        callback(list);
      }, 200);
    }

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      void supabase.removeChannel(channel);
    };
  },

  /** One-shot fetch — used by SSR-like flows or manual refresh. */
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, sku, name, brand, origin_country, origin_region, tag_line, description_md,
        variants:product_variants(id, size_label, selling_price_paise, mrp_paise, in_stock, sort_order),
        images:product_images(id, url, is_primary, sort_order, alt_text),
        category:categories(id, name, slug)
      `)
      .eq('status', 'active')
      .order('name');

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[productService.list]', error);
      return [];
    }

    return (data ?? []).map(mapSupabaseProduct);
  },

  /** Lookup a single product by id (UUID). */
  async get(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, sku, name, brand, origin_country, origin_region, tag_line, description_md,
        variants:product_variants(id, size_label, selling_price_paise, mrp_paise, in_stock, sort_order),
        images:product_images(id, url, is_primary, sort_order, alt_text),
        category:categories(id, name, slug)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabaseProduct(data);
  },
};
