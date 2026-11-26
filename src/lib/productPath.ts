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
 * to the clean slug, or 410 when the product is no longer live. Known legacy
 * name slugs (LEGACY_PRODUCT_SLUGS) always 301, never 410.
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
 * old URLs (e.g. /shop/ceylon-cinnamon).
 *
 * This is the one retired-slug rule (P38, F20). A mapped slug always 301s,
 * never 410:
 *   - successor live → 301 to the successor
 *   - vanilla family (VANILLA_LEGACY_SLUGS), successor not live → 301 to
 *     /shop/tahitian-vanilla-beans when that is live, else /shop
 *   - any other mapped slug, successor not live → 301 to /shop
 * Retired slugs from the live catalogue (renamed or split products) go here
 * too, e.g. /shop/muscovado-cane-sugar, which split into dark and light muscovado.
 *
 * /shop/bean-to-bar-kit is not in this map. The kit is not for sale, so that
 * URL 301s to /shop (see RETIRED_SLUG_TARGET) instead of a product or a 410.
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
  'muscovado-sugar': 'dark-muscovado-cane-sugar',
  // Retired live-catalogue slug (F20). Dark muscovado is the same sugar.
  'muscovado-cane-sugar': 'dark-muscovado-cane-sugar',
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
  'sourdough-starter-kit': 'heritage-sourdough-kit',
  'croissant-lamination-kit': 'croissant-lamination-kit',
  'ganache-mastery-kit': 'ganache-mastery-kit',
  'spice-explorer-trio': 'spice-explorer-trio',
};

/** Legacy vanilla slugs whose fallback is the live vanilla product, not /shop. */
export const VANILLA_LEGACY_SLUGS: ReadonlySet<string> = new Set([
  'madagascar-vanilla',
  'tahitian-vanilla',
  'bourbon-vanilla-extract',
]);

/** The live vanilla product legacy vanilla URLs fall back to. */
export const VANILLA_FALLBACK_SLUG = 'tahitian-vanilla-beans';

/** `/shop/<slug>` when a live product has that slug, else `/shop`. */
function livePathOrShop<T extends { id: string; name?: string | null }>(
  slug: string,
  products: readonly T[],
): { to: string; product?: T } {
  const live = products.find((p) => productSlug(p) === slug);
  return live ? { to: productPath(live), product: live } : { to: '/shop' };
}

/**
 * Category slugs that are not in the live tree but have a sensible home (F21).
 * There is no Vanilla category today; the vanilla product sits under
 * extracts-flavors. A real category with the same slug always wins.
 */
export const CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  vanilla: VANILLA_FALLBACK_SLUG,
  'vanilla-beans': VANILLA_FALLBACK_SLUG,
};

/**
 * Where `/shop/category/<slug>` should 301 to, or null to serve it as usual.
 * Null when the slug is a real category (`hasCategory`) or is not an alias.
 * Otherwise the aliased live product path, or /shop when that is not live.
 */
export function categoryAliasTarget<T extends { id: string; name?: string | null }>(
  slug: string,
  hasCategory: (slug: string) => boolean,
  products: readonly T[],
): string | null {
  if (hasCategory(slug)) return null;
  const target = CATEGORY_ALIASES[slug.toLowerCase()];
  if (target === undefined) return null;
  return livePathOrShop(target, products).to;
}

/**
 * Retired catalogue slugs that 301 to a non-product URL. The bean-to-bar kit
 * is not live; advertising its old URL (or answering 410) is a Search Console
 * soft 404. vercel.json redirects the same path at the edge.
 */
export const RETIRED_SLUG_TARGET: Readonly<Record<string, string>> = {
  'bean-to-bar-kit': '/shop',
};

export type ProductResolution<T> =
  | { kind: 'found'; product: T }
  | { kind: 'redirect'; to: string; product?: T } // legacy / non-canonical URL → 301
  | { kind: 'gone' }                              // existed once, not live now → 410
  | { kind: 'not-found' };                        // never existed → 404

/**
 * A product the public catalogue does not show. The server reads only these
 * three fields with the service-role key. Visible means the same thing as the
 * live catalogue query and RLS: status is active and deleted_at is null.
 */
export interface ConcealedProduct {
  name: string;
  status: string | null;
  deleted_at: string | null;
}

/**
 * True when `param` is the current slug of a product that exists but is not
 * publicly visible (archived, draft, deleted, or any status other than active).
 * Slug matching uses the same `productSlug` as live URLs, so a rename follows
 * the database name. An active, non-deleted row does not match.
 */
export function isConcealedProductSlug(param: string, rows: readonly ConcealedProduct[]): boolean {
  let slug = param.trim().toLowerCase();
  try { slug = decodeURIComponent(slug); } catch { /* param is already a slug */ }
  slug = slug.toLowerCase();
  if (!slug) return false;
  return rows.some((row) => {
    const name = row.name.trim();
    if (!name) return false;
    const visible = row.status === 'active' && (row.deleted_at == null || row.deleted_at === '');
    if (visible) return false;
    return productSlug({ id: '', name }) === slug;
  });
}

/**
 * Resolve a `/shop/:param` segment against the LIVE catalogue (status=active,
 * deleted_at null — RLS hides everything else from the public key).
 *
 * - retired slug (RETIRED_SLUG_TARGET) → 301 to that target (/shop), even if a
 *   live row would slug to the same path
 * - `<slug>`          → found
 * - `<slug>-<uuid>`, `<uuid>`, mixed case → redirect to the clean slug
 * - UUID that isn't live → gone (UUIDs aren't guessable, so it existed once)
 * - static-catalogue slug → 301 to its live successor; else, for the vanilla
 *   family, to the live vanilla product; else to /shop. Never gone.
 * - anything else → not-found. With the service-role key set, the renderer
 *   301s to /shop when the slug matches a hidden product, and 404s when it
 *   never existed. Preview has no service-role key, so a hidden slug stays 404.
 */
export function resolveProductParam<T extends { id: string; name?: string | null }>(
  param: string,
  products: readonly T[],
): ProductResolution<T> {
  const lower = param.toLowerCase();
  // Before a live-slug match: this URL 301s to /shop even if a row would slug to it.
  const retired = RETIRED_SLUG_TARGET[lower];
  if (retired !== undefined) return { kind: 'redirect', to: retired };

  const exact = products.find((p) => productSlug(p) === param);
  if (exact) return { kind: 'found', product: exact };

  const uuid = param.match(UUID_RE)?.[0]?.toLowerCase();
  if (uuid) {
    const byId = products.find((p) => p.id.toLowerCase() === uuid);
    return byId ? { kind: 'redirect', product: byId, to: productPath(byId) } : { kind: 'gone' };
  }

  if (lower !== param) {
    const ci = products.find((p) => productSlug(p) === lower);
    if (ci) return { kind: 'redirect', product: ci, to: productPath(ci) };
  }

  const successor = LEGACY_PRODUCT_SLUGS[lower];
  if (successor !== undefined) {
    const live = products.find((p) => productSlug(p) === successor);
    if (live) return { kind: 'redirect', product: live, to: productPath(live) };
    if (VANILLA_LEGACY_SLUGS.has(lower)) return { kind: 'redirect', ...livePathOrShop(VANILLA_FALLBACK_SLUG, products) };
    return { kind: 'redirect', to: '/shop' };
  }
  return { kind: 'not-found' };
}
