import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/data/products';
import { COMING_SOON } from '../../src/content/comingSoon';
import { BULK_GUIDE_ALLOWLIST, BULK_GUIDE_LABEL, bulkGuideHref } from '../../src/content/bulkGuideLink';
import { WHOLESALE_GUIDE_PATH } from '../../src/content/wholesaleGuide';
import { productPath } from '../../src/lib/productPath';
import type { Product } from '../../src/types';

/**
 * Buying in bulk? is an allowlist of slug + category. Couverture is dark and
 * milk only. The other three catalogue pages are Dutch-process cocoa, cocoa
 * butter, and palm jaggery. Coconut sugar is allowlisted but has no page.
 */

const DENIED = [
  'Japanese matcha',
  'Whole vanilla beans',
  'Pistachio paste',
  'Mānuka Honey UMF 15+',
  'Pure Bourbon Vanilla Extract',
  'White Couverture 32%',
  'Criollo Cacao Nibs',
  'Dark Muscovado Cane Sugar',
];

describe('bulk guide allowlist', () => {
  it('links only the allowlisted catalogue pages, with no price or minimum on the label', () => {
    const linked = PRODUCTS.filter((product) => bulkGuideHref(product));
    expect(linked.map((product) => productPath(product))).toEqual([
      '/shop/india-trinitario-couverture-70',
      '/shop/black-dutch-process-cocoa',
      '/shop/milk-couverture-38',
      '/shop/deodorized-cocoa-butter',
      '/shop/palm-sugar-jaggery',
    ]);
    for (const product of linked) {
      expect(bulkGuideHref(product)).toBe(WHOLESALE_GUIDE_PATH);
    }
    expect(BULK_GUIDE_LABEL).toBe('Buying in bulk?');
    expect(BULK_GUIDE_LABEL).not.toMatch(/₹|\bkg\b|minimum/i);
    expect(PRODUCTS.some((product) => productPath(product) === '/shop/coconut-sugar')).toBe(false);
    expect(BULK_GUIDE_ALLOWLIST.map((row) => row.slug)).toContain('coconut-sugar');
  });

  it('does not link matcha, vanilla, pistachio, honey, white couverture, or any other product', () => {
    for (const name of DENIED) {
      const product = PRODUCTS.find((item) => item.name === name);
      const probe: Pick<Product, 'name' | 'category'> = product ?? { name, category: 'Spices & Pantry' };
      expect(bulkGuideHref(probe), name).toBeNull();
    }
    for (const item of COMING_SOON) {
      expect(bulkGuideHref({ name: item.name, categorySlug: item.key }), item.key).toBeNull();
    }
    expect(bulkGuideHref({
      name: 'Coconut Sugar',
      category: 'Sugars & Sweeteners',
    })).toBe(WHOLESALE_GUIDE_PATH);
    expect(bulkGuideHref({
      name: 'Coconut Sugar',
      categorySlug: 'cocoa-chocolate',
    })).toBeNull();
  });
});
