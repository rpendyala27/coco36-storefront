import type { Product, ProductTag } from '../types';

/**
 * Claims discipline: a certification badge (or an "organic" badge) shows on a
 * product only while a certificate of that type is valid today for the
 * product's supplier or one of its released lots in stock. The database
 * decides (public.product_claims(): product id + claim slug, nothing else);
 * this filters the product's tags to match. If the claims can't be loaded,
 * every claim tag is dropped: no certificate on record means no badge.
 *
 * Tags that make no certification claim (dietary such as "vegan", use cases,
 * designations like "Bestseller") are left alone.
 */

export type Claims = Map<string, Set<string>>;

export function isClaimTag(t: Pick<ProductTag, 'slug' | 'kind'>): boolean {
  return t.kind === 'certification' || /organic/i.test(t.slug);
}

export function claimsFromRows(rows: readonly { product_id: string; claim: string }[] | null | undefined): Claims {
  const out: Claims = new Map();
  for (const r of rows ?? []) {
    if (!r?.product_id || !r?.claim) continue;
    const set = out.get(r.product_id) ?? new Set<string>();
    set.add(String(r.claim).toLowerCase());
    out.set(r.product_id, set);
  }
  return out;
}

export function backedTags(productId: string, tags: readonly ProductTag[] | undefined, claims: Claims | null): ProductTag[] {
  const held = claims?.get(productId);
  return (tags ?? []).filter((t) => {
    if (!isClaimTag(t)) return true;
    if (!held) return false;
    const slug = t.slug.toLowerCase();
    if (held.has(slug)) return true;
    // A generic "organic" tag is backed by any valid organic certificate.
    return t.kind !== 'certification' && /organic/.test(slug) && [...held].some((c) => /organic/.test(c));
  });
}

export function applyClaims<P extends Pick<Product, 'id' | 'tags'>>(products: readonly P[], claims: Claims | null): P[] {
  return products.map((p) => ({ ...p, tags: backedTags(p.id, p.tags, claims) }));
}
