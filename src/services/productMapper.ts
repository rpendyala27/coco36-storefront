import type { Product, ProductTag } from '../types';

/**
 * Supabase row → storefront Product. Pure (no client, no import.meta.env) so the
 * Vercel render function can map PostgREST rows exactly the way the browser
 * does — the server-rendered snapshot, meta tags and JSON-LD then match what the
 * SPA shows once it boots.
 *
 * Pricing is paise end-to-end — no conversion happens here.
 */

/** Columns + embeds for a full product. PostgREST select syntax (same string
 *  works for supabase-js `.select()` and a raw `?select=` query). */
export const PRODUCT_SELECT = `
  id, name, brand, origin_country, origin_region, tag_line, description_md, updated_at,
  variants:product_variants(id, sku_code, size_label, selling_price_paise, mrp_paise, in_stock, sort_order),
  images:product_images(id, url, is_primary, sort_order, alt_text),
  category:categories(id, name, slug, parent_id),
  product_tags(tag:tags(slug, label, kind))
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapSupabaseProduct(row: any): Product {
  const images = (row.images ?? []).slice().sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const primary = images.find((i: any) => i.is_primary) ?? images[0];
  const hover   = images.find((i: any) => !i.is_primary) ?? images[1];
  // Primary first, then the rest in sort order — the gallery / JSON-LD order.
  const ordered = primary ? [primary, ...images.filter((i: any) => i !== primary)] : images;

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
    name:     row.name,
    brand:    row.brand ?? '',
    origin:   [row.origin_country, row.origin_region].filter(Boolean).join(' · '),
    originCountry: row.origin_country ?? undefined,
    tag:      row.tag_line ?? '',
    image:    primary?.url ?? '',
    imageHover: hover?.url,
    images:   ordered.map((i: any) => ({ url: i.url as string, alt: (i.alt_text as string | null) ?? null })),
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
      ...(v.sku_code ? { sku: v.sku_code as string } : {}),
    })),
    updatedAt:   row.updated_at ?? undefined,
    // No reviews table exists yet. Never derive these from anything but real
    // reviews — they feed aggregateRating structured data.
    rating:      undefined,
    reviewCount: undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
