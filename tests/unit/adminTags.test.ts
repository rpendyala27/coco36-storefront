import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComingSoonRow } from '../../src/components/ComingSoonRow';
import { DesignationBadges } from '../../src/components/DesignationBadges';
import { GoodForChips } from '../../src/components/GoodForChips';
import { TrustBand } from '../../src/components/TrustBand';
import { COMING_SOON_NOTE } from '../../src/content/comingSoon';
import {
  OUT_OF_STOCK_LABEL, OUT_OF_STOCK_SHORT, displayBadgeLabel, productBadges, shortBadgeLabel,
} from '../../src/lib/badges';
import { featuredProducts } from '../../src/lib/catalog';
import { marksFromClaims } from '../../src/lib/claimMarks';
import { designationBrowseTiles } from '../../src/lib/designationTiles';
import { readTagSlugs, shopTagPath } from '../../src/lib/shopTags';
import type { Product, ProductTag } from '../../src/types';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';

const html = (node: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, node));

const tag = (slug: string, label: string, kind: ProductTag['kind']): ProductTag => ({ slug, label, kind });

function product(partial: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    brand: 'COCO36',
    origin: 'Madagascar',
    tag: '',
    image: 'https://img.example/p.jpg',
    category: 'Vanilla',
    description: '',
    sizes: [{ id: 'v1', label: '100 g', priceInPaise: 10000, inStock: true }],
    ...partial,
  };
}

const FORBIDDEN_MARKS = [
  'USDA Organic', 'Fairtrade', 'Fair Trade', 'BRCGS', 'Halal', 'Kosher',
  'Rainforest', 'Certified Vegan', 'Gluten-Free', 'Gluten Free', 'FSSAI', 'Organic',
];

describe('designation badges', () => {
  it('shows designation badges while a product is in stock, capped at two', () => {
    const chips = productBadges(product({
      id: 'p', name: 'Salt',
      tags: [
        tag('bestseller', 'Bestseller', 'designation'),
        tag('new-arrival', 'New Arrival', 'designation'),
        tag('limited-edition', 'Limited Edition', 'designation'),
      ],
    }));
    expect(chips.map((c) => c.label)).toEqual(['Bestseller', 'New Arrival']);
    expect(chips.every((c) => c.role === 'designation')).toBe(true);
  });

  it('keeps designation badges on a sold-out product and adds the stock pill outside the cap', () => {
    const chips = productBadges(product({
      id: 'p', name: 'Sugar',
      sizes: [{ id: 'v', label: '250 g', priceInPaise: 62300, inStock: false }],
      tags: [
        tag('limited-edition', 'Limited Edition', 'designation'),
        tag('new-arrival', 'New Arrival', 'designation'),
        tag('out-of-stock', 'Out of Stock', 'designation'),
      ],
    }));
    expect(chips.map((c) => [c.role, c.label])).toEqual([
      ['stock', OUT_OF_STOCK_LABEL],
      ['designation', 'Limited Edition'],
      ['designation', 'New Arrival'],
    ]);
    expect(chips.filter((c) => c.role === 'designation')).toHaveLength(2);
  });

  it('lets Coming Soon replace the stock pill, trims the label, and stays first inside the cap', () => {
    const chips = productBadges(product({
      id: 'p', name: 'Tahitian Vanilla Beans',
      sizes: [
        { id: 'a', label: '10 beans', priceInPaise: 1, inStock: false },
        { id: 'b', label: '25 beans', priceInPaise: 2, inStock: false },
      ],
      tags: [
        tag('bestseller', 'Bestseller', 'designation'),
        tag('limited-edition', 'Limited Edition', 'designation'),
        tag('coming-soon', 'Coming Soon..', 'designation'),
      ],
    }));
    expect(chips.map((c) => c.label)).toEqual(['Coming Soon', 'Bestseller']);
    expect(chips.some((c) => c.role === 'stock')).toBe(false);
    expect(displayBadgeLabel('Coming Soon...')).toBe('Coming Soon');
    expect(displayBadgeLabel('Coming Soon…')).toBe('Coming Soon');
  });

  it('keeps the full Coming Soon label at the card font size, including on phone-width cards and the PDP', () => {
    expect(shortBadgeLabel('coming-soon', 'Coming Soon..')).toBe('Coming Soon');
    expect(shortBadgeLabel('coming-soon', 'Coming Soon..')).not.toBe('Soon');
    expect(shortBadgeLabel('coming-soon', 'Coming Soon..')).not.toBe('Coming');
    expect(shortBadgeLabel('new-arrival', 'New Arrival')).toBe('New');
    expect(shortBadgeLabel('limited-edition', 'Limited Edition')).toBe('Limited');
    expect(OUT_OF_STOCK_SHORT).toBe('Sold out');
    const chips = productBadges(product({
      id: 'p', name: 'Tahitian Vanilla Beans',
      sizes: [{ id: 'v', label: '10 beans', priceInPaise: 1, inStock: false }],
      tags: [tag('coming-soon', 'Coming Soon..', 'designation')],
    }));
    const card = html(createElement(DesignationBadges, { variant: 'card', chips }));
    const overlay = html(createElement(DesignationBadges, { variant: 'overlay', chips }));
    const inline = html(createElement(DesignationBadges, { variant: 'inline', chips }));
    for (const markup of [card, overlay, inline]) {
      expect(markup).toContain('Coming Soon');
      expect(markup).not.toContain('>Soon<');
      expect(markup).not.toContain('Coming Soon..');
      expect(markup).not.toContain(OUT_OF_STOCK_LABEL);
    }
    expect(card).toContain('text-[10px]');
    expect(card).toContain('whitespace-normal');
    expect(card).not.toMatch(/text-\[9px\]|text-\[8px\]/);
    expect(overlay).toContain('text-[11px]');
    expect(inline).toContain('text-[11px]');
  });

  it('follows the coming-soon and out-of-stock slugs when the admin label changes', () => {
    const chips = productBadges(product({
      id: 'p', name: 'Tahitian Vanilla Beans',
      sizes: [{ id: 'v', label: '10 beans', priceInPaise: 1, inStock: false }],
      tags: [
        tag('coming-soon', 'Arriving later', 'designation'),
        tag('out-of-stock', 'Sold through', 'designation'),
      ],
    }));
    expect(chips.map((c) => c.slug)).toEqual(['coming-soon']);
    expect(chips.some((c) => c.role === 'stock')).toBe(false);
  });

  it('does not invent a stock pill for an in-stock product, and does not keep static badges once sold out', () => {
    expect(productBadges(product({ id: 'p', name: 'Flour' })).some((c) => c.role === 'stock')).toBe(false);
    const sold = productBadges(product({
      id: 'p', name: 'Flour',
      sizes: [{ id: 'v', label: '500 g', priceInPaise: 1, inStock: false }],
      badges: ['Best Seller', 'Staff Pick'],
    }));
    expect(sold.map((c) => c.label)).toEqual([OUT_OF_STOCK_LABEL]);
  });
});

describe('good for chips', () => {
  it('links each use-case tag to the shop tag facet and skips anything else', () => {
    const markup = html(createElement(GoodForChips, {
      tags: [
        tag('baking', 'Baking', 'use_case'),
        tag('desserts', 'Desserts', 'use_case'),
        tag('patissiers', 'Pâtissiers', 'use_case'),
        tag('vegan', 'Vegan', 'dietary'),
        tag('coming-soon', 'Coming Soon..', 'designation'),
      ],
    }));
    expect(markup).toContain('Good for');
    expect(markup).toContain(`href="${shopTagPath('baking')}"`);
    expect(markup).toContain(`href="${shopTagPath('desserts')}"`);
    expect(markup).toContain(`href="${shopTagPath('patissiers')}"`);
    expect(markup).toContain('Pâtissiers');
    expect(markup).not.toContain('Vegan');
    expect(markup).not.toContain('Coming Soon');
    expect(shopTagPath('baking')).toBe('/shop?tag=baking');
    expect(readTagSlugs(new URLSearchParams('tag=baking&tag=desserts&tag=baking'))).toEqual(['baking', 'desserts']);
    expect(html(createElement(GoodForChips, { tags: [] }))).toBe('');
  });
});

describe('designation browse tiles', () => {
  it('is driven by live designation tags, including sold-out products, and skips status slugs', () => {
    const tiles = designationBrowseTiles([
      product({
        id: 'oos', name: 'Dark Muscovado',
        sizes: [{ id: 'v', label: '250 g', priceInPaise: 1, inStock: false }],
        tags: [
          tag('limited-edition', 'Limited Edition', 'designation'),
          tag('new-arrival', 'New Arrival', 'designation'),
          tag('out-of-stock', 'Out of Stock', 'designation'),
        ],
      }),
      product({
        id: 'soon', name: 'Tahitian Vanilla Beans',
        image: 'https://img.example/vanilla.jpg',
        sizes: [{ id: 'v', label: '10 beans', priceInPaise: 1, inStock: false }],
        tags: [tag('coming-soon', 'Coming Soon..', 'designation')],
      }),
      product({
        id: 'plain', name: 'No image', image: '',
        tags: [tag('bestseller', 'Bestseller', 'designation')],
      }),
    ]);
    expect(tiles.map((t) => [t.slug, t.label])).toEqual([
      ['new-arrival', 'New arrivals'],
      ['limited-edition', 'Limited Edition'],
    ]);
  });

  it('keeps the homepage featured sort: bestseller, then new arrival, then in stock', () => {
    const names = featuredProducts([
      product({ id: 'c', name: 'C', sizes: [{ id: 'v', label: '1', priceInPaise: 1, inStock: false }] }),
      product({ id: 'b', name: 'B', tags: [tag('new-arrival', 'New Arrival', 'designation')], sizes: [{ id: 'v', label: '1', priceInPaise: 1, inStock: false }] }),
      product({ id: 'a', name: 'A', tags: [tag('bestseller', 'Bestseller', 'designation')], sizes: [{ id: 'v', label: '1', priceInPaise: 1, inStock: false }] }),
      product({ id: 'd', name: 'D' }),
    ]).map((p) => p.name);
    expect(names).toEqual(['A', 'B', 'D', 'C']);
  });
});

describe('coming soon row', () => {
  it('hides itself when no live product is tagged, and otherwise uses the product id', () => {
    expect(html(createElement(ComingSoonRow, { products: [] }))).toBe('');
    expect(html(createElement(ComingSoonRow, {
      products: [product({ id: 'plain', name: 'Maldon Flaky Sea Salt' })],
    }))).toBe('');

    const id = '33d84e95-a57d-4dce-ac5d-102b4fbce4f7';
    const markup = html(createElement(ComingSoonRow, {
      products: [
        product({ id: 'other', name: 'Maldon Flaky Sea Salt' }),
        product({
          id, name: 'Tahitian Vanilla Beans',
          tags: [tag('coming-soon', 'Coming Soon..', 'designation')],
        }),
      ],
    }));
    expect(markup).toContain('Coming soon');
    expect(markup).toContain('Tahitian Vanilla Beans');
    expect(markup).toContain('href="/shop/tahitian-vanilla-beans"');
    expect(markup).toContain(COMING_SOON_NOTE);
    expect(markup).toContain(`data-product-key="${id}"`);
    expect(markup).not.toContain('japanese-matcha');
    expect(markup).not.toContain('Whole vanilla beans');
    expect(markup).not.toContain('Japanese matcha');
  });
});

describe('trust band', () => {
  it('fails closed: no claim rows means no certification marks', () => {
    expect(marksFromClaims(null)).toEqual([]);
    expect(marksFromClaims([])).toEqual([]);
    expect(marksFromClaims([{ claim: 'fssai' }, { claim: 'USDA-Organic' }, { claim: 'usda-organic' }])).toEqual([
      { slug: 'usda-organic', label: 'USDA Organic' },
    ]);
    const empty = html(createElement(TrustBand, { marks: [] }));
    expect(empty).toContain('36-Step Traceable');
    for (const word of FORBIDDEN_MARKS) expect(empty, word).not.toContain(word);
    const one = html(createElement(TrustBand, { marks: [{ slug: 'usda-organic', label: 'USDA Organic' }] }));
    expect(one).toContain('USDA Organic');
    expect(one).not.toContain('Halal');
    expect(one).not.toContain('Fairtrade');
  });
});

const PRODUCT_ID = '33d84e95-a57d-4dce-ac5d-102b4fbce4f7';
const CATEGORY_ID = '0b6a3c43-5c47-4b1e-9c38-2a7f2d1a9b01';

const vanillaRow = {
  id: PRODUCT_ID, name: 'Tahitian Vanilla Beans', brand: 'Tahaa Vanilla Atelier',
  origin_country: 'French Polynesia', origin_region: 'Tahaa', tag_line: '',
  description_md: 'Whole beans.', updated_at: '2026-11-01T00:00:00Z',
  variants: [{ id: 'v1', size_label: '10 beans', selling_price_paise: 315400, mrp_paise: 315400, in_stock: false, sort_order: 0 }],
  images: [],
  category: { id: CATEGORY_ID, name: 'Vanilla', slug: 'vanilla', parent_id: null },
  product_tags: [
    { tag: { slug: 'coming-soon', label: 'Coming Soon..', kind: 'designation' } },
    { tag: { slug: 'baking', label: 'Baking', kind: 'use_case' } },
    { tag: { slug: 'desserts', label: 'Desserts', kind: 'use_case' } },
    { tag: { slug: 'patissiers', label: 'Pâtissiers', kind: 'use_case' } },
    { tag: { slug: 'organic', label: 'Organic', kind: 'certification' } },
  ],
};
const category = { id: CATEGORY_ID, slug: 'vanilla', name: 'Vanilla', parent_id: null, sort_order: 0, image_url: null, description: null };

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function mockCatalog(claims: unknown[] | 'fail') {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('rpc/product_claims')) {
      if (claims === 'fail') return new Response('{"message":"boom"}', { status: 500 });
      return new Response(JSON.stringify(claims), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const body = url.includes('/rest/v1/products') ? [vanillaRow]
      : url.includes('/rest/v1/categories') ? [category]
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('server snapshot', () => {
  it('lists a coming-soon product by its real URL and hides certification marks when claims are empty', async () => {
    mockCatalog([]);
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).toContain('<h2>Coming soon</h2>');
    expect(shop.body).toContain('href="/shop/tahitian-vanilla-beans"');
    expect(shop.body).toContain('Tahitian Vanilla Beans');
    expect(shop.body).toContain(COMING_SOON_NOTE);
    expect(shop.body).not.toContain('Japanese matcha');
    expect(shop.body).not.toContain('Whole vanilla beans');
    for (const word of FORBIDDEN_MARKS) expect(shop.body, word).not.toContain(word);

    const page = await render('/shop/tahitian-vanilla-beans', '', 'coco36.com');
    expect(page.body).toContain('data-designation-badges');
    expect(page.body).toContain('Coming Soon');
    expect(page.body).not.toContain('Coming Soon..');
    const badges = page.body.match(/data-designation-badges>([^<]*)</)?.[1];
    expect(badges).toBe('Coming Soon');
    expect(page.body).toContain('Good for');
    expect(page.body).toContain('href="/shop?tag=baking"');
    expect(page.body).toContain('href="/shop?tag=desserts"');
    expect(page.body).toContain('href="/shop?tag=patissiers"');
    expect(page.body).toContain('Pâtissiers');
    expect(page.body).not.toContain('>Organic<');
  });

  it('shows a claim mark only when product_claims returns it, and nothing when the read fails', async () => {
    mockCatalog([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
    resetCatalogCache();
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).toContain('USDA Organic');
    expect(shop.body).not.toContain('Halal');
    resetCatalogCache();
    mockCatalog('fail');
    const failed = await render('/shop', '', 'coco36.com');
    expect(failed.body).not.toContain('USDA Organic');
    expect(failed.body).not.toContain('>Organic<');
  });
});
