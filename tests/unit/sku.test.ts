import { describe, expect, it } from 'vitest';
import { mapSupabaseProduct, PRODUCT_SELECT } from '../../src/services/productMapper';
import { productJsonLd } from '../../src/seo/jsonld';
import { findPackBySku } from '../../src/lib/findPack';

/** Phase 2.1: the SKU is per pack (product_variants.sku_code); there is no product-level SKU. */

const row = {
  id: 'p1', name: 'Muscovado Cane Sugar', brand: 'COCO36', origin_country: 'India', origin_region: null, tag_line: '', description_md: 'Dark sugar.',
  variants: [
    { id: 'v2', sku_code: 'CO-SUG-MUSC-1KG', size_label: '1 kg', selling_price_paise: 52000, in_stock: false, sort_order: 2 },
    { id: 'v1', sku_code: 'CO-SUG-MUSC-250G', size_label: '250 g', selling_price_paise: 15000, in_stock: true, sort_order: 1 },
  ],
  images: [], category: { id: 'c1', name: 'Sugars & Sweeteners', slug: 'sugars-sweeteners' }, product_tags: [],
};

describe('per-pack SKU', () => {
  it('the product query asks for each pack\'s sku_code and no product sku', () => {
    expect(PRODUCT_SELECT).toMatch(/product_variants\(id, sku_code,/);
    expect(PRODUCT_SELECT).not.toMatch(/^\s*id, sku,/m);
  });

  it('maps sku_code onto each size; the product has no sku', () => {
    const p = mapSupabaseProduct(row);
    expect(p).not.toHaveProperty('sku');
    expect(p.sizes.map((s) => [s.label, s.sku])).toEqual([['250 g', 'CO-SUG-MUSC-250G'], ['1 kg', 'CO-SUG-MUSC-1KG']]);
  });

  it('JSON-LD carries the SKU on each offer, not on the product', () => {
    const ld = productJsonLd(mapSupabaseProduct(row)) as unknown as { sku?: string; offers: { name: string; sku?: string }[] };
    expect(ld.sku).toBeUndefined();
    expect(ld.offers.map((o) => [o.name, o.sku])).toEqual([['250 g', 'CO-SUG-MUSC-250G'], ['1 kg', 'CO-SUG-MUSC-1KG']]);
  });

  it('Quick Order finds the exact pack by its SKU, ignoring case and spaces', () => {
    const products = [mapSupabaseProduct(row)];
    expect(findPackBySku(products, ' co-sug-musc-1kg ')).toMatchObject({ product: { id: 'p1' }, size: { id: 'v2', label: '1 kg' } });
    expect(findPackBySku(products, 'CO-SUG-MUSC-250G')?.size.id).toBe('v1');
    expect(findPackBySku(products, 'CO-SGR-001')).toBeNull();
    expect(findPackBySku(products, '')).toBeNull();
  });
});
