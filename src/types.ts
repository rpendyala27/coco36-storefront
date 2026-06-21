export interface Ingredient {
  id: string;
  name: string;
  origin: string;
  tag: string;
  image: string;
  description?: string;
  specs?: { label: string; value: string }[];
}

export interface ProductSize {
  /** Variant ID from Supabase, or a stable slug for static catalogue items. */
  id: string;
  label: string;          // "2 oz", "8 oz", "1 lb"
  /** Canonical price in INR paise. 1 INR = 100 paise. */
  priceInPaise: number;
  inStock: boolean;
}

/** Display label for a designation badge. Sourced from `designation`-kind tags
 *  (or the static catalogue) — no longer a hardcoded union. */
export type ProductBadge = string;

/** Loosened from a hardcoded 6-name union — categories are now DB-driven and
 *  hierarchical. Filtering uses `categoryId` (subtree rollup) with the tree from
 *  `useCategories`; `category` stays as the display name. */
export type ProductCategory = string;

/** Semantic class of a tag — drives the storefront filter groups + badges,
 *  replacing the old hardcoded slug sets. Mirrors `tags.kind` in Postgres. */
export type TagKind = 'certification' | 'dietary' | 'designation' | 'use_case' | 'attribute';

/** A product_tag resolved to its label + kind. */
export interface ProductTag {
  slug: string;
  label: string;
  kind: TagKind;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;          // maker/estate label — Supplier → Brand → Product
  origin: string;
  tag: string;
  image: string;
  imageHover?: string;
  /** Display name of the product's category. Hierarchical filtering uses
   *  `categoryId` (rolled up over the subtree), not this string. */
  category: ProductCategory;
  /** DB category id — the real filter key (any level of the tree). */
  categoryId?: string;
  /** Category slug — used for URL state on the shop. */
  categorySlug?: string;
  description: string;
  /** Designation badges (Best Seller, New…) — derived from `designation` tags. */
  badges?: ProductBadge[];
  /** All product_tags with their `kind`. The storefront groups filters by kind
   *  (certification / dietary / use_case) and renders designation tags as badges. */
  tags?: ProductTag[];
  sizes: ProductSize[];
  rating?: number;
  reviewCount?: number;
}

export interface CartItem {
  productId: string;
  /** Variant ID — matches Supabase `product_variants.id` when sourced from DB. */
  sizeId: string;
  quantity: number;
  // denormalized for display
  name: string;
  sizeLabel: string;
  /** Canonical price in INR paise. */
  unitPriceInPaise: number;
  image: string;
}
