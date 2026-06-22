import { supabase } from '../lib/supabase';
import { Product, ProductTag } from '../types';

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

const PRODUCT_SELECT = `
  id, sku, name, brand, origin_country, origin_region, tag_line, description_md,
  variants:product_variants(id, size_label, selling_price_paise, mrp_paise, in_stock, sort_order),
  images:product_images(id, url, is_primary, sort_order, alt_text),
  category:categories(id, name, slug, parent_id),
  product_tags(tag:tags(slug, label, kind))
`;

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

  // product_tags → { slug, label, kind }[]. Designation tags surface as badges.
  const tags: ProductTag[] = (row.product_tags ?? [])
    .map((pt: any) => pt.tag)
    .filter(Boolean)
    .map((t: any) => ({ slug: t.slug as string, label: t.label as string, kind: (t.kind ?? 'attribute') }));
  const badges = tags.filter((t) => t.kind === 'designation').map((t) => t.label);

  return {
    id:       row.id,
    sku:      row.sku ?? '',
    name:     row.name,
    brand:    row.brand ?? '',
    origin:   [row.origin_country, row.origin_region].filter(Boolean).join(' · '),
    tag:      row.tag_line ?? '',
    image:    primary?.url ?? '',
    imageHover: hover?.url,
    category:     row.category?.name ?? 'Uncategorized',
    categoryId:   row.category?.id,
    categorySlug: row.category?.slug,
    description: row.description_md ?? '',
    badges,
    tags,
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
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
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
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabaseProduct(data);
  },
};
