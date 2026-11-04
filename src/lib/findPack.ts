import type { Product, ProductSize } from '../types';

/**
 * Quick Order: a SKU is one pack (CO-<CAT3>-<PROD4>-<PACK>), so it names both
 * the product and the size. Case and spaces around it don't matter.
 */
export function findPackBySku(products: readonly Product[], sku: string): { product: Product; size: ProductSize } | null {
  const term = sku.trim().toLowerCase();
  if (!term) return null;
  for (const product of products) {
    const size = product.sizes.find((s) => s.sku?.toLowerCase() === term);
    if (size) return { product, size };
  }
  return null;
}
