import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_PAGE_SLUGS, productPage } from '../../src/content/productPages';
import { richPlain } from '../../src/content/richText';
import { buildTree } from '../../src/lib/categoryTree';
import { imageUrl } from '../../src/lib/img';
import { productPath } from '../../src/lib/productPath';
import { productMeta } from '../../src/seo/meta';
import { DEFAULT_POLICY } from '../../src/seo/site';
import { composeProductDescription, DESCRIPTION_MAX, fitWithin, TITLE_MAX } from '../../src/seo/text';
import type { Product, ProductSize } from '../../src/types';
import { resetCatalogCache } from '../../server/catalog';
import { render, setTemplate } from '../../server/render';
import { auditHtml, takeFindings } from '../../scripts/seo-audit.mjs';

/**
 * Editorial product pages. Prices and stock in the assertions are the
 * 10 November 2026 catalogue readings from the copy brief. The builders
 * read them off the product, they do not hardcode a second price list.
 */

const NOW = new Date('2026-11-10T12:00:00.000Z');
const tree = buildTree([]);

const size = (label: string, rupees: number, inStock: boolean, sku: string): ProductSize => ({
  id: sku.toLowerCase(),
  label,
  priceInPaise: rupees * 100,
  inStock,
  sku,
});

function product(partial: Pick<Product, 'name' | 'brand' | 'origin' | 'sizes'> & Partial<Product>): Product {
  return {
    id: partial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    tag: '',
    image: partial.image ?? 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&q=80&w=800',
    description: partial.description ?? '',
    category: partial.category ?? 'Mixes & Kits',
    ...partial,
  };
}

const KIT = product({
  name: 'Heritage Sourdough Kit',
  brand: 'COCO36 House',
  origin: 'India',
  originCountry: 'India',
  category: 'Mixes & Kits',
  description: 'Living sourdough starter from a 100-year SF culture, paired with our heritage flour blend and a banneton.',
  image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&q=80&w=800',
  sizes: [size('Starter Kit', 5312, false, 'KIT-SRDK-EA')],
  rating: 4.7,
  reviewCount: 41,
});

const SALT = product({
  name: 'Maldon Flaky Sea Salt',
  brand: 'Maldon Salt Co.',
  origin: 'England · Essex',
  originCountry: 'England',
  category: 'Spices & Pantry',
  description: 'Iconic English pyramid sea salt — the chefs choice for finishing chocolate, caramel, and bread.',
  image: 'https://images.unsplash.com/photo-1606588347049-62bfd0c118d5?auto=format&fit=crop&q=80&w=800',
  sizes: [size('250 g', 743, false, 'SPC-MALD-250G'), size('750 g', 1826, false, 'SPC-MALD-750G')],
  rating: 4.9,
  reviewCount: 587,
});

const DARK = product({
  name: 'Dark Muscovado Cane Sugar',
  brand: 'Mauritius Sugar Estate',
  origin: 'Mauritius · Mauritius',
  originCountry: 'Mauritius',
  category: 'Sugars & Sweeteners',
  description: 'Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Stone-ground in small batches.',
  image: 'https://res.cloudinary.com/doee8wtag/image/upload/v1/dark-muscovado.jpg',
  sizes: [size('250 g', 623, true, 'SGR-MUSD-250G'), size('1 kg', 1992, false, 'SGR-MUSD-1KG')],
});

const LIGHT = product({
  name: 'Light Muscovado Cane Sugar',
  brand: 'Mauritius Sugar Estate',
  origin: 'Mauritius',
  originCountry: 'Mauritius',
  category: 'Sugars & Sweeteners',
  description: 'Light muscovado: unrefined cane sugar with gentle caramel and molasses notes. Stone-ground in small batches.',
  image: 'https://images.unsplash.com/photo-1633299258059-66b1111f4ea3?auto=format&fit=crop&q=80&w=800',
  sizes: [size('250 g', 623, false, 'SGR-MUSL-250G')],
});

const PAGES = [
  {
    product: KIT,
    title: 'Heritage Sourdough Starter Kit | COCO36',
    h1: 'Heritage sourdough starter kit',
    description: 'Living sourdough starter from a 100-year SF culture, with heritage flour and a banneton. ₹5,312, ships across India.',
    sku: 'KIT-SRDK-EA',
  },
  {
    product: SALT,
    title: 'Maldon Flaky Sea Salt in India | COCO36',
    h1: 'Maldon flaky sea salt',
    description: 'Maldon pyramid sea-salt flakes from Essex, England, for finishing chocolate, caramel and bread. From ₹743. Ships across India.',
    sku: undefined,
  },
  {
    product: DARK,
    title: 'Dark Muscovado Sugar in India | COCO36',
    h1: 'Dark muscovado cane sugar',
    description: 'Unrefined dark muscovado cane sugar from Mauritius, with more of its molasses left in. 250 g ₹623; 1 kg ₹1,992. Ships across India.',
    sku: undefined,
  },
  {
    product: LIGHT,
    title: 'Light Muscovado Sugar in India | COCO36',
    h1: 'Light muscovado cane sugar',
    description: 'Unrefined light muscovado cane sugar from Mauritius, with caramel and molasses notes. 250 g ₹623. Ships across India.',
    sku: 'SGR-MUSL-250G',
  },
] as const;

type Ld = {
  '@type': string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  image?: string[];
  aggregateRating?: unknown;
  review?: unknown;
  additionalProperty?: { name: string; value: string | number; unitCode?: string }[];
  weight?: { '@type': string; value: number; unitCode: string };
  offers?: {
    '@type': string;
    name: string;
    sku?: string;
    price: string;
    priceCurrency: string;
    priceValidUntil?: string;
    availability: string;
    additionalProperty?: { name: string; value: string | number; unitCode?: string; unitText?: string };
    hasMerchantReturnPolicy?: { merchantReturnLink?: string };
    shippingDetails?: { deliveryTime?: { transitTime?: { minValue: number; maxValue: number } } };
  }[];
};

function ldOf(p: Product): { meta: ReturnType<typeof productMeta>; product: Ld; faqs: { name: string; acceptedAnswer: { text: string } }[] } {
  const meta = productMeta(p, tree, DEFAULT_POLICY, NOW);
  const productLd = meta.jsonLd.find((b) => b.id === 'product')!.data as Ld;
  const faq = meta.jsonLd.find((b) => b.id === 'faq')!.data as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  return { meta, product: productLd, faqs: faq.mainEntity };
}

describe('product page editorial copy', () => {
  it('covers the four slugs and no others', () => {
    expect(PRODUCT_PAGE_SLUGS).toEqual([
      'heritage-sourdough-kit',
      'maldon-flaky-sea-salt',
      'dark-muscovado-cane-sugar',
      'light-muscovado-cane-sugar',
    ]);
    expect(productPage(product({ name: 'Madagascar Bourbon Vanilla Beans', brand: 'COCO36', origin: 'Madagascar', sizes: [] }))).toBeUndefined();
  });

  it('uses the brief titles, H1s and complete metas for the 10 November prices', () => {
    for (const page of PAGES) {
      const copy = productPage(page.product)!;
      const { meta } = ldOf(page.product);
      expect(copy.title, page.product.name).toBe(page.title);
      expect(copy.h1, page.product.name).toBe(page.h1);
      expect(meta.title, page.product.name).toBe(page.title);
      expect(meta.title.length, page.product.name).toBeLessThanOrEqual(TITLE_MAX);
      expect(meta.description, page.product.name).toBe(page.description);
      expect(meta.description.length, meta.description).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(meta.description, page.product.name).not.toMatch(/…|\.\.\./);
      expect(meta.description, page.product.name).not.toMatch(/\b(in stock|out of stock)\b/i);
    }
  });

  it('does not cut a long catalogue description mid-sentence', () => {
    const p = product({
      name: 'Dark Muscovado Sample',
      brand: 'Mauritius Sugar Estate',
      origin: 'Mauritius',
      originCountry: 'Mauritius',
      description: 'Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Stone-ground in small batches.',
      sizes: [size('250 g', 623, true, 'SGR-SAMPLE-250'), size('1 kg', 1992, false, 'SGR-SAMPLE-1KG')],
    });
    const meta = productMeta(p, tree, DEFAULT_POLICY, NOW);
    expect(meta.description).toBe('Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Origin: Mauritius. From ₹623, shipped across India.');
    expect(meta.description).not.toMatch(/…/);
    expect(meta.description).not.toContain('Stone-ground in…');
  });

  it('ellipsizes only a sentence that cannot fit, and otherwise keeps the price line whole', () => {
    const overlong = 'x'.repeat(DESCRIPTION_MAX + 40);
    const cut = fitWithin(overlong, DESCRIPTION_MAX);
    expect(cut.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(cut.endsWith('…')).toBe(true);

    const suffixOnly = composeProductDescription(overlong, 'Origin: Mauritius.', 'From ₹10, shipped across India.');
    expect(suffixOnly).toBe('From ₹10, shipped across India.');
    expect(suffixOnly).not.toMatch(/…/);
  });

  it('keeps a short catalogue description, its origin and its price', () => {
    const p = product({
      name: 'Madagascar Bourbon Vanilla Beans',
      brand: 'COCO36',
      origin: 'Madagascar · SAVA',
      originCountry: 'Madagascar',
      description: 'Plump, oily Grade A vanilla beans from the SAVA region.',
      sizes: [size('5 beans', 899, true, 'VAN-BOUR-5')],
    });
    const description = productMeta(p, tree).description;
    expect(description).toBe('Plump, oily Grade A vanilla beans from the SAVA region. Origin: Madagascar. ₹899, shipped across India.');
    expect(description).not.toMatch(/…/);
  });

  it('FAQPage JSON-LD matches the visible FAQ words, including link labels', () => {
    for (const page of PAGES) {
      const copy = productPage(page.product)!;
      const { faqs } = ldOf(page.product);
      expect(faqs.map((f) => f.name)).toEqual(copy.faqs.map((f) => f.q));
      expect(faqs.map((f) => f.acceptedAnswer.text)).toEqual(copy.faqs.map((f) => richPlain(f.a)));
      for (const faq of faqs) {
        expect(faq.acceptedAnswer.text).not.toMatch(/\]\(|\{[^|]+\|/);
        expect(faq.acceptedAnswer.text.length).toBeGreaterThan(20);
      }
    }
  });

  it('reads price and availability from the product, and keeps one Offer per size', () => {
    const dark = ldOf(DARK);
    expect(dark.product.offers?.map((o) => [o['@type'], o.name, o.sku, o.price, o.availability])).toEqual([
      ['Offer', '250 g', 'SGR-MUSD-250G', '623.00', 'https://schema.org/InStock'],
      ['Offer', '1 kg', 'SGR-MUSD-1KG', '1992.00', 'https://schema.org/OutOfStock'],
    ]);
    expect(JSON.stringify(dark.product)).not.toContain('AggregateOffer');

    const repriced = product({
      ...KIT,
      sizes: [size('Starter Kit', 5400, true, 'KIT-SRDK-EA')],
    });
    const again = ldOf(repriced);
    expect(again.meta.description).toContain('₹5,400');
    expect(again.meta.description).not.toContain('₹5,312');
    expect(again.meta.description).not.toMatch(/\b(in stock|out of stock)\b/i);
    const stockAnswer = again.faqs.find((f) => f.name === 'Is the kit in stock?')?.acceptedAnswer.text ?? '';
    expect(stockAnswer).toContain('in stock');
    expect(again.product.offers?.[0]).toMatchObject({
      price: '5400.00',
      availability: 'https://schema.org/InStock',
      sku: 'KIT-SRDK-EA',
    });
  });

  it('fills the structured-data gaps without inventing GTIN, MPN, reviews or a restock date', () => {
    for (const page of PAGES) {
      const { product: ld } = ldOf(page.product);
      expect(ld.sku, page.product.name).toBe(page.sku);
      expect(ld.gtin, page.product.name).toBeUndefined();
      expect(ld.mpn, page.product.name).toBeUndefined();
      expect(ld.aggregateRating, page.product.name).toBeUndefined();
      expect(ld.review, page.product.name).toBeUndefined();
      expect(JSON.stringify(ld), page.product.name).not.toMatch(/"gtin|"mpn|"aggregateRating"|"review"/);
      expect(ld.image).toEqual([imageUrl(page.product.image, 1200)]);
      for (const offer of ld.offers ?? []) {
        expect(offer.priceCurrency).toBe('INR');
        expect(offer.priceValidUntil).toBe('2027-11-10');
        expect(offer.hasMerchantReturnPolicy?.merchantReturnLink).toBe('https://coco36.com/returns');
        expect(offer.shippingDetails?.deliveryTime?.transitTime).toMatchObject({ minValue: 3, maxValue: 10, unitCode: 'DAY' });
        expect(JSON.stringify(offer)).not.toMatch(/availabilityStarts|availabilityEnds/);
      }
    }

    const kit = ldOf(KIT).product;
    expect(kit.additionalProperty?.map((p) => p.value)).toEqual([
      'Living sourdough starter from a 100-year SF culture',
      'Heritage flour blend',
      'Banneton',
    ]);
    expect(kit.offers?.[0].additionalProperty).toBeUndefined();

    expect(ldOf(SALT).product.offers?.map((o) => o.additionalProperty)).toEqual([
      { '@type': 'PropertyValue', name: 'Net weight', value: 250, unitCode: 'GRM', unitText: 'g' },
      { '@type': 'PropertyValue', name: 'Net weight', value: 750, unitCode: 'GRM', unitText: 'g' },
    ]);
    expect(ldOf(DARK).product.offers?.map((o) => o.additionalProperty?.value)).toEqual([250, 1]);
    expect(ldOf(LIGHT).product.offers?.[0].additionalProperty).toMatchObject({ name: 'Net weight', value: 250, unitCode: 'GRM' });
    expect(ldOf(LIGHT).product).toMatchObject({ weight: { '@type': 'QuantitativeValue', value: 250, unitCode: 'GRM' } });
    expect(ldOf(DARK).product.weight).toBeUndefined();
  });

  it('stays inside the claim limits: no city, licence, health, pure or 100% claims', () => {
    const blob = PAGES.map((page) => {
      const copy = productPage(page.product)!;
      return [
        copy.title, copy.h1, copy.metaDescription, ...copy.intro,
        ...copy.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
        ...copy.faqs.flatMap((f) => [f.q, f.a]),
        ...copy.related.map((l) => l.label),
      ].join(' ');
    }).join('\n');
    expect(blob).not.toMatch(/Visakhapatnam|Vizag/i);
    expect(blob).not.toMatch(/FSSAI/i);
    expect(blob).not.toMatch(/\b100\s*%/);
    expect(blob).not.toMatch(/\bpure\b/i);
    expect(blob).not.toMatch(/detox|low-GI|low GI|antioxidant|immunity|healthier/i);
    expect(blob).not.toMatch(/coming soon/i);
    expect(blob).not.toMatch(/repack/i);
    expect(blob).toMatch(/100-year/);
  });
});

describe('rendered product HTML', () => {
  const rows = [
    row(KIT, 'c1', 'mixes-kits', 'Mixes & Kits'),
    row(SALT, 'c2', 'spices-pantry', 'Spices & Pantry'),
    row(DARK, 'c3', 'sugars-sweeteners', 'Sugars & Sweeteners'),
    row(LIGHT, 'c3', 'sugars-sweeteners', 'Sugars & Sweeteners'),
  ];
  const categories = [
    { id: 'c1', slug: 'mixes-kits', name: 'Mixes & Kits', parent_id: null, sort_order: 1, image_url: null, description: null },
    { id: 'c2', slug: 'spices-pantry', name: 'Spices & Pantry', parent_id: null, sort_order: 2, image_url: null, description: null },
    { id: 'c3', slug: 'sugars-sweeteners', name: 'Sugars & Sweeteners', parent_id: null, sort_order: 3, image_url: null, description: null },
  ];

  beforeAll(() => {
    setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
  });

  beforeEach(() => {
    resetCatalogCache();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes('/rest/v1/products') ? rows
        : url.includes('/rest/v1/categories') ? categories
        : url.includes('/rest/v1/settings') ? [{ key: 'shipping.free_threshold_paise', value: 120000 }]
        : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('serves the four pages with one h1, the new meta, visible FAQs and a clean SEO audit', async () => {
    takeFindings();
    for (const page of PAGES) {
      const pathName = productPath(page.product);
      const res = await render(pathName, '', 'coco36.com');
      expect(res.status, pathName).toBe(200);
      expect(res.body).toContain(`<title>${page.title}</title>`);
      expect(res.body).toContain(`content="${page.description}"`);
      expect(res.body).toContain(`<h1>${page.h1}</h1>`);
      expect(res.body.match(/<h1[\s>]/g)).toHaveLength(1);
      const copy = productPage(page.product)!;
      const visible = (res.body.split('<div id="root">')[1] ?? res.body)
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1');
      for (const faq of copy.faqs) {
        expect(visible, faq.q).toContain(faq.q);
        expect(visible, faq.q).toContain(richPlain(faq.a));
      }
      expect(res.body).not.toContain('terms#returns');
      auditHtml(pathName, res.body, { expectUrl: `https://coco36.com${pathName}` });
    }
    const report = takeFindings();
    expect(report.errors, report.errors.join('\n')).toEqual([]);
  });
});

function row(p: Product, categoryId: string, slug: string, categoryName: string) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    origin_country: p.originCountry,
    origin_region: p.origin.split('·')[1]?.trim() ?? null,
    tag_line: p.tag,
    description_md: p.description,
    updated_at: '2026-11-10T00:00:00Z',
    variants: p.sizes.map((s, i) => ({
      id: s.id,
      sku_code: s.sku,
      size_label: s.label,
      selling_price_paise: s.priceInPaise,
      mrp_paise: s.priceInPaise,
      in_stock: s.inStock,
      sort_order: i,
    })),
    images: [{ id: `${p.id}-img`, url: p.image, is_primary: true, sort_order: 0, alt_text: p.name }],
    category: { id: categoryId, name: categoryName, slug, parent_id: null },
    product_tags: [],
  };
}
