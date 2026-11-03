/**
 * Product + category URL helpers. Shared by the Vite app AND the Vercel render
 * function (api/render.ts), so it must stay pure: no DOM, no import.meta.env,
 * and only `.js`-suffixed relative imports (Node ESM needs the extension).
 *
 * URL scheme:
 *   /shop/<name-slug>               product (canonical, slug only)
 *   /shop/category/<category-slug>  category listing
 *
 * Product URLs used to carry the UUID (`/shop/<slug>-<uuid>`, and before that a
 * bare `/shop/<uuid>`). Those still resolve: the server answers them with a 301
 * to the clean slug, or 410 when the product is no longer live.
 *
 * The slug is derived from the product name — the `products` table has no slug
 * column. Two live products with the same name would share a URL (the first by
 * name order wins), so keep live product names unique in the admin.
 */

/** Lowercase, hyphenated, ASCII-only — "Mānuka Honey 15+" → "manuka-honey-15". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics (ā → a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')      // any non-alphanum → hyphen
    .replace(/^-+|-+$/g, '');         // trim leading/trailing hyphens
}

export const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The URL slug for a product. Falls back to the id for an unsluggable name. */
export function productSlug(p: { id: string; name?: string | null }): string {
  return slugify(p.name ?? '') || p.id;
}

/** Canonical product path: `/shop/<name-slug>`. */
export function productPath(p: { id: string; name?: string | null }): string {
  return `/shop/${productSlug(p)}`;
}

/** Canonical category listing path: `/shop/category/<slug>`. */
export function categoryPath(c: { slug: string }): string {
  return `/shop/category/${c.slug}`;
}

/**
 * Slugs from the pre-Supabase static catalogue (src/data/products.ts ids), each
 * mapped to the slug the same product has today. Google still holds some of the
 * old URLs (e.g. /shop/ceylon-cinnamon, /shop/bean-to-bar-kit). When the
 * successor is live the old URL 301s to it; otherwise it answers 410 Gone.
 */
export const LEGACY_PRODUCT_SLUGS: Readonly<Record<string, string>> = {
  'criollo-cacao-nibs': 'criollo-cacao-nibs',
  'india-trinitario-couverture': 'india-trinitario-couverture-70',
  'natural-cocoa-powder': 'natural-cocoa-powder',
  'dutch-process-cocoa': 'black-dutch-process-cocoa',
  'milk-couverture-38': 'milk-couverture-38',
  'white-couverture-32': 'white-couverture-32',
  'cocoa-butter-deodorized': 'deodorized-cocoa-butter',
  'einkorn-flour': 'einkorn-heritage-flour',
  'type-00-pizza-flour': 'type-00-pizza-flour',
  'whole-rye-flour': 'whole-dark-rye-flour',
  'spelt-flour': 'wholemeal-spelt-flour',
  'almond-flour-blanched': 'blanched-almond-flour',
  'buckwheat-flour': 'dark-buckwheat-flour',
  'muscovado-sugar': 'muscovado-cane-sugar',
  'manuka-honey-15': 'manuka-honey-umf-15',
  'maple-syrup-grade-a': 'grade-a-dark-maple-syrup',
  'palm-sugar-jaggery': 'palm-sugar-jaggery',
  'demerara-sugar': 'demerara-sugar-crystals',
  'madagascar-vanilla': 'madagascar-bourbon-vanilla-beans',
  'tahitian-vanilla': 'tahitian-vanilla-beans',
  'bourbon-vanilla-extract': 'pure-bourbon-vanilla-extract',
  'almond-extract': 'pure-almond-extract',
  'orange-blossom-water': 'orange-blossom-water',
  'lemon-paste': 'sicilian-lemon-paste',
  'rose-water': 'damascus-rose-water',
  'ceylon-cinnamon': 'ceylon-cinnamon-quills',
  'pink-himalayan-salt': 'pink-himalayan-salt',
  'maldon-flake-salt': 'maldon-flaky-sea-salt',
  'madagascar-cardamom': 'green-cardamom-pods',
  'iranian-saffron': 'pure-iranian-saffron-threads',
  'tonka-beans': 'whole-tonka-beans',
  'dried-mediterranean-figs': 'dried-mediterranean-figs',
  'sicilian-pistachio': 'bronte-pistachio-paste',
  'bean-to-bar-kit': 'bean-to-bar-craft-kit',
  'sourdough-starter-kit': 'heritage-sourdough-kit',
  'croissant-lamination-kit': 'croissant-lamination-kit',
  'ganache-mastery-kit': 'ganache-mastery-kit',
  'spice-explorer-trio': 'spice-explorer-trio',
};

export type ProductResolution<T> =
  | { kind: 'found'; product: T }
  | { kind: 'redirect'; product: T; to: string }  // legacy / non-canonical URL → 301
  | { kind: 'gone' }                              // existed once, not live now → 410
  | { kind: 'not-found' };                        // never existed → 404

/**
 * Resolve a `/shop/:param` segment against the LIVE catalogue (status=active,
 * deleted_at null — RLS hides everything else from the public key).
 *
 * - `<slug>`          → found
 * - `<slug>-<uuid>`, `<uuid>`, mixed case → redirect to the clean slug
 * - UUID that isn't live → gone (UUIDs aren't guessable, so it existed once)
 * - static-catalogue slug → 301 to its live successor, else gone
 * - anything else → not-found
 */
export function resolveProductParam<T extends { id: string; name?: string | null }>(
  param: string,
  products: readonly T[],
): ProductResolution<T> {
  const exact = products.find((p) => productSlug(p) === param);
  if (exact) return { kind: 'found', product: exact };

  const uuid = param.match(UUID_RE)?.[0]?.toLowerCase();
  if (uuid) {
    const byId = products.find((p) => p.id.toLowerCase() === uuid);
    return byId ? { kind: 'redirect', product: byId, to: productPath(byId) } : { kind: 'gone' };
  }

  const lower = param.toLowerCase();
  if (lower !== param) {
    const ci = products.find((p) => productSlug(p) === lower);
    if (ci) return { kind: 'redirect', product: ci, to: productPath(ci) };
  }

  const successor = LEGACY_PRODUCT_SLUGS[lower];
  if (successor !== undefined) {
    const live = products.find((p) => productSlug(p) === successor);
    return live ? { kind: 'redirect', product: live, to: productPath(live) } : { kind: 'gone' };
  }
  return { kind: 'not-found' };
}
