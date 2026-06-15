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

export type ProductBadge = 'Best Seller' | 'New' | 'Limited Harvest' | 'Staff Pick';

export type ProductCategory =
  | 'Cocoa & Chocolate'
  | 'Flours & Grains'
  | 'Sugars & Sweeteners'
  | 'Extracts & Flavors'
  | 'Spices & Pantry'
  | 'Mixes & Kits';

/** A product_tag resolved to its label. `slug` may be namespaced, e.g. `cert:coa`. */
export interface ProductTag {
  slug: string;
  label: string;
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
  category: ProductCategory;
  description: string;
  badges?: ProductBadge[];
  /** All product_tags (designation, dietary, and `cert:*` certification tags).
   *  Storefront renders cert/dietary tags as placeholders — no fabricated numbers. */
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
