import { productSlug, slugify } from '../lib/productPath.js';
import { WHOLESALE_GUIDE_PATH } from './wholesaleGuide.js';

/**
 * "Buying in bulk?" is an explicit allowlist of product slug + category slug.
 * Name matching is not used. The link is only the wholesale guide: no price
 * and no minimum quantity on the product page.
 *
 * Coconut sugar is allowlisted for the slug a product of that name would use.
 * No coconut-sugar product page exists in the catalogue yet.
 */
export const BULK_GUIDE_ALLOWLIST = [
  { slug: 'india-trinitario-couverture-70', categorySlug: 'cocoa-chocolate' },
  { slug: 'milk-couverture-38', categorySlug: 'cocoa-chocolate' },
  { slug: 'black-dutch-process-cocoa', categorySlug: 'cocoa-chocolate' },
  { slug: 'deodorized-cocoa-butter', categorySlug: 'cocoa-chocolate' },
  { slug: 'palm-sugar-jaggery', categorySlug: 'sugars-sweeteners' },
  { slug: 'coconut-sugar', categorySlug: 'sugars-sweeteners' },
] as const;

export const BULK_GUIDE_LABEL = 'Buying in bulk?';

export interface BulkLinkProduct {
  id?: string;
  name?: string | null;
  categorySlug?: string | null;
  category?: string | null;
}

function categorySlugOf(product: BulkLinkProduct): string {
  const explicit = product.categorySlug?.trim();
  if (explicit) return explicit;
  return product.category ? slugify(product.category) : '';
}

export function bulkGuideHref(product: BulkLinkProduct): string | null {
  const slug = productSlug({ id: product.id ?? '', name: product.name });
  const categorySlug = categorySlugOf(product);
  const allowed = BULK_GUIDE_ALLOWLIST.some((row) => row.slug === slug && row.categorySlug === categorySlug);
  return allowed ? WHOLESALE_GUIDE_PATH : null;
}
