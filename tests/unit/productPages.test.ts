import { describe, expect, it } from 'vitest';
import { visibleCopy } from '../../src/content/linkify';
import { productPageFor, productPageMeta, PRODUCT_PAGE_SLUGS } from '../../src/content/productPages';
import { buildTree } from '../../src/lib/categoryTree';
import { productJsonLd, priceValidUntil } from '../../src/seo/jsonld';
import { productMeta } from '../../src/seo/meta';
import { DEFAULT_POLICY } from '../../src/seo/site';
import { composeProductDescription, DESCRIPTION_MAX, TITLE_MAX } from '../../src/seo/text';
import type { Product, ProductSize } from '../../src/types';
import { productSnapshot } from '../../server/snapshot';
import { renderHead } from '../../server/html';

const tree = buildTree([]);

const size = (label: string, sku: string, rupees: number, inStock: boolean): ProductSize => ({
  id: sku, label, sku, priceInPaise: rupees * 100, inStock,
});

function product(partial: Partial<Product> & Pick<Product, 'name' | 'sizes'>): Product {
  return {
    id: partial.name,
    brand: 'COCO36',
    origin: 'India',
    tag: '',
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&q=80&w=800',
    category: 'Pantry',
    description: '',
    ...partial,
  };
}

const kit = product({
  name: 'Heritage Sourdough Kit',
  brand: 'COCO36 House',
  origin: 'India',
  originCountry: 'India',
  category: 'Mixes & Kits',
  description: 'Living sourdough starter from a 100-year SF culture, paired with our heritage flour blend and a banneton.',
  image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&q=80&w=800',
  rating: 4.7,
  reviewCount: 12,
  sizes: [size('Starter Kit', 'KIT-SRDK-EA', 5312, false)],
});

const salt = product({
  name: 'Maldon Flaky Sea Salt',
  brand: 'Maldon Salt Co.',
  origin: 'England · Essex',
  originCountry: 'England',
  category: 'Spices & Pantry',
  description: "Iconic English pyramid sea salt — the chefs choice for finishing chocolate, caramel, and bread.",
  image: 'https://images.unsplash.com/photo-1606588347049-62bfd0c118d5?auto=format&fit=crop&q=80&w=800',
  rating: 4.9,
  reviewCount: 80,
  sizes: [size('250 g', 'SPC-MALD-250G', 743, false), size('750 g', 'SPC-MALD-750G', 1826, false)],
});

const dark = product({
  name: 'Dark Muscovado Cane Sugar',
  brand: 'Mauritius Sugar Estate',
  origin: 'Mauritius · Mauritius',
  originCountry: 'Mauritius',
  category: 'Sugars & Sweeteners',
  description: 'Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Stone-ground in small batches.',
  image: 'https://res.cloudinary.com/doee8wtag/image/upload/v1/dark-muscovado.jpg',
  sizes: [size('250 g', 'SGR-MUSD-250G', 623, true), size('1 kg', 'SGR-MUSD-1KG', 1992, false)],
});

const light = product({
  name: 'Light Muscovado Cane Sugar',
  brand: 'Mauritius Sugar Estate',
  origin: 'Mauritius',
  originCountry: 'Mauritius',
  category: 'Sugars & Sweeteners',
  description: 'Light muscovado: unrefined cane sugar with gentle caramel and molasses notes. Stone-ground in small batches.',
  image: 'https://images.unsplash.com/photo-1633299258059-66b1111f4ea3?auto=format&fit=crop&q=80&w=800',
  sizes: [size('250 g', 'SGR-MUSL-250G', 623, false)],
});

const PAGES = [kit, salt, dark, light];

const EXPECTED = {
  [kit.name]: {
    title: 'Heritage Sourdough Starter Kit | COCO36',
    h1: 'Heritage sourdough starter kit',
    description: 'Living sourdough starter from a 100-year SF culture, with heritage flour and a banneton. ₹5,312, ships across India. Currently out of stock.',
  },
  [salt.name]: {
    title: 'Maldon Flaky Sea Salt in India | COCO36',
    h1: 'Maldon flaky sea salt',
    description: 'Maldon pyramid sea-salt flakes from Essex, England, for finishing chocolate, caramel and bread. From ₹743. Ships across India; currently out of stock.',
  },
  [dark.name]: {
    title: 'Dark Muscovado Sugar in India | COCO36',
    h1: 'Dark muscovado cane sugar',
    description: 'Unrefined dark muscovado cane sugar from Mauritius, with more of its molasses left in. 250 g ₹623 in stock; 1 kg ₹1,992 out of stock. Ships across India.',
  },
  [light.name]: {
    title: 'Light Muscovado Sugar in India | COCO36',
    h1: 'Light muscovado cane sugar',
    description: 'Unrefined light muscovado cane sugar from Mauritius, with caramel and molasses notes. 250 g ₹623. Ships across India; currently out of stock.',
  },
} as const;

type Ld = {
  name: string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  image?: string[];
  description: string;
  aggregateRating?: unknown;
  review?: unknown;
  weight?: { value: number; unitCode: string };
  additionalProperty?: { name: string; value: string | number; unitCode?: string; description?: string }[];
  offers: {
    '@type': string;
    name: string;
    sku?: string;
    price: string;
    priceCurrency: string;
    priceValidUntil: string;
    availability: string;
    shippingDetails: { deliveryTime: { handlingTime: { maxValue: number }; transitTime: { minValue: number; maxValue: number } } };
    hasMerchantReturnPolicy: { merchantReturnLink: string };
  }[];
};

function ldOf(p: Product): Ld {
  const block = productPageMeta(p, tree, DEFAULT_POLICY).jsonLd.find((b) => b.id === 'product');
  return block!.data as unknown as Ld;
}

const text = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ');

const FORBIDDEN = /\b(?:pure|detox|repack|FSSAI|Visakhapatnam|Vizag)\b|100\s*%|low[-\s]?GI|coming soon/i;

describe('product meta no longer clips mid-sentence', () => {
  it('drops the sentence that does not fit instead of ending on an ellipsis', () => {
    const out = composeProductDescription(
      'Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Stone-ground in small batches.',
      'Origin: Mauritius.',
      'From ₹623, shipped across India.',
    );
    expect(out).toBe('Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Origin: Mauritius. From ₹623, shipped across India.');
    expect(out).not.toContain('…');
    expect(out).not.toContain('Stone-ground in');
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('productMeta uses that complete sentence for a catalogue description', () => {
    const meta = productMeta(product({
      name: 'Sample Cane Sugar',
      originCountry: 'Mauritius',
      description: 'Dark muscovado: unrefined cane sugar that keeps more of its molasses, for a deeper, richer flavour. Stone-ground in small batches.',
      sizes: [size('250 g', 'SGR-X-250G', 623, true)],
    }), tree);
    expect(meta.description).not.toContain('…');
    expect(meta.description.endsWith('shipped across India.')).toBe(true);
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe('editorial product pages', () => {
  it('covers the four slugs and no others', () => {
    expect(PRODUCT_PAGE_SLUGS).toEqual([
      'heritage-sourdough-kit',
      'maldon-flaky-sea-salt',
      'dark-muscovado-cane-sugar',
      'light-muscovado-cane-sugar',
    ]);
    expect(productPageFor(product({ name: 'Vanilla Beans', sizes: [] }))).toBeUndefined();
  });

  it('uses the proposed title and meta, complete, under the limits', () => {
    for (const p of PAGES) {
      const meta = productPageMeta(p, tree, DEFAULT_POLICY);
      const page = productPageFor(p)!;
      const want = EXPECTED[p.name as keyof typeof EXPECTED];
      expect(meta.title, p.name).toBe(want.title);
      expect(meta.title.length, p.name).toBeLessThanOrEqual(TITLE_MAX);
      expect(meta.description, p.name).toBe(want.description);
      expect(meta.description.length, p.name).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(meta.description, p.name).not.toContain('…');
      expect(page.h1, p.name).toBe(want.h1);
      expect(meta.path).toBe(`/shop/${page.slug}`);
    }
  });

  it('FAQPage JSON-LD matches the visible questions and answers', () => {
    for (const p of PAGES) {
      const page = productPageFor(p)!;
      const meta = productPageMeta(p, tree, DEFAULT_POLICY);
      const faq = meta.jsonLd.find((b) => b.id === 'faq')!.data as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
      };
      expect(faq.mainEntity.map((q) => q.name)).toEqual(page.faqs.map((f) => f.q));
      expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(page.faqs.map((f) => visibleCopy(f.a)));
      const html = productSnapshot({ products: [p], tree, policy: DEFAULT_POLICY }, p, [
        { name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: p.name, path: `/shop/${page.slug}` },
      ]);
      const visible = text(html);
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html).toContain(`<h1>${page.h1}</h1>`);
      for (const f of page.faqs) {
        const answer = visibleCopy(f.a);
        expect(visible, f.q).toContain(f.q);
        // Same check as scripts/seo-audit.mjs: the start of each answer is in the tag-stripped body.
        expect(visible, f.q).toContain(answer.slice(0, 60));
      }
    }
  });

  it('keeps prices and availability on separate offers from the catalogue', () => {
    const offers = ldOf(dark).offers;
    expect(offers.map((o) => [o['@type'], o.name, o.sku, o.price, o.priceCurrency, o.availability])).toEqual([
      ['Offer', '250 g', 'SGR-MUSD-250G', '623.00', 'INR', 'https://schema.org/InStock'],
      ['Offer', '1 kg', 'SGR-MUSD-1KG', '1992.00', 'INR', 'https://schema.org/OutOfStock'],
    ]);
    expect(ldOf(salt).offers.map((o) => [o.price, o.availability])).toEqual([
      ['743.00', 'https://schema.org/OutOfStock'],
      ['1826.00', 'https://schema.org/OutOfStock'],
    ]);
    expect(ldOf(kit).offers[0]).toMatchObject({ price: '5312.00', availability: 'https://schema.org/OutOfStock', sku: 'KIT-SRDK-EA' });
    expect(ldOf(light).offers[0]).toMatchObject({ price: '623.00', availability: 'https://schema.org/OutOfStock', sku: 'SGR-MUSL-250G' });
    const html = productSnapshot({ products: [dark], tree, policy: DEFAULT_POLICY }, dark, []);
    expect(html).toContain('250 g (SKU SGR-MUSD-250G): ₹623 — in stock');
    expect(html).toContain('1 kg (SKU SGR-MUSD-1KG): ₹1,992 — out of stock');
    expect(html).not.toMatch(/coming soon/i);
  });

  it('follows a stock change instead of the 10 Nov wording', () => {
    const back = { ...salt, sizes: salt.sizes.map((s) => ({ ...s, inStock: true })) };
    const meta = productPageMeta(back, tree, DEFAULT_POLICY);
    expect(meta.description).toContain('in stock');
    expect(meta.description).not.toContain('currently out of stock');
    expect(ldOf(back).offers.every((o) => o.availability.endsWith('InStock'))).toBe(true);
    const oneLeft = {
      ...dark,
      sizes: [dark.sizes[0], { ...dark.sizes[1], inStock: true }],
    };
    expect(productPageMeta(oneLeft, tree).description).toContain('1 kg ₹1,992 in stock');
    expect(ldOf(oneLeft).offers[1].availability).toBe('https://schema.org/InStock');
  });

  it('fills weight, contents, return link, transit time and a price horizon without inventing identifiers or reviews', () => {
    const kitLd = ldOf(kit);
    expect(kitLd.sku).toBe('KIT-SRDK-EA');
    expect(kitLd.weight).toBeUndefined();
    expect(kitLd.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Contents', value: 'Living sourdough starter from a 100-year SF culture; heritage flour blend; banneton' },
    ]);
    const saltLd = ldOf(salt);
    expect(saltLd.sku).toBeUndefined();
    expect(saltLd.weight).toBeUndefined();
    expect(saltLd.additionalProperty?.map((w) => [w.name, w.value, w.unitCode, w.description])).toEqual([
      ['Net weight', 250, 'GRM', '250 g'],
      ['Net weight', 750, 'GRM', '750 g'],
    ]);
    const darkLd = ldOf(dark);
    expect(darkLd.sku).toBeUndefined();
    expect(darkLd.additionalProperty?.map((w) => [w.value, w.unitCode])).toEqual([[250, 'GRM'], [1, 'KGM']]);
    const lightLd = ldOf(light);
    expect(lightLd.sku).toBe('SGR-MUSL-250G');
    expect(lightLd.weight).toEqual({ '@type': 'QuantitativeValue', value: 250, unitCode: 'GRM' });

    for (const p of PAGES) {
      const ld = ldOf(p);
      expect(ld.gtin).toBeUndefined();
      expect(ld.mpn).toBeUndefined();
      expect(ld.aggregateRating).toBeUndefined();
      expect(ld.review).toBeUndefined();
      expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|"gtin|"mpn|"review"/);
      const image = ld.image?.join(' ') ?? '';
      expect(image.startsWith('https://'), p.name).toBe(true);
      expect(image, p.name).toContain(p.image.includes('cloudinary') ? 'dark-muscovado.jpg' : p.image.match(/photo-[0-9-]+/)![0]);
      for (const offer of ld.offers) {
        expect(offer.priceValidUntil).toBe(priceValidUntil());
        expect(offer.hasMerchantReturnPolicy.merchantReturnLink).toBe('https://coco36.com/returns');
        expect(offer.shippingDetails.deliveryTime.transitTime).toEqual({ '@type': 'QuantitativeValue', minValue: 3, maxValue: 10, unitCode: 'DAY' });
        expect(offer.shippingDetails.deliveryTime.handlingTime.maxValue).toBe(2);
      }
    }
  });

  it('does not add health, purity, licence or dispatch-city claims to the new copy', () => {
    for (const p of PAGES) {
      const page = productPageFor(p)!;
      const blob = [
        page.title, page.h1, page.meta, ...page.intro, ...page.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
        ...page.faqs.flatMap((f) => [f.q, f.a]), ...page.links.map((l) => l.label),
      ].join('\n');
      expect(blob, p.name).not.toMatch(FORBIDDEN);
    }
    const kitHtml = productSnapshot({ products: [kit], tree, policy: DEFAULT_POLICY }, kit, []);
    expect(kitHtml).toContain('href="/ingredients/flours"');
    expect(kitHtml).toContain('href="/shipping"');
    expect(kitHtml).toContain('href="/returns"');
    const saltHtml = productSnapshot({ products: [salt], tree, policy: DEFAULT_POLICY }, salt, []);
    expect(saltHtml).toContain('href="https://maldonsalt.com/about-us/"');
  });
});

describe('crawler HTML for the four pages', () => {
  it('builds a head and body the SEO audit can check', () => {
    for (const p of PAGES) {
      const meta = productPageMeta(p, tree, DEFAULT_POLICY);
      const html = `<!doctype html><html><head>\n${renderHead(meta)}\n</head><body><div id="root">${productSnapshot({ products: PAGES, tree, policy: DEFAULT_POLICY }, p, [
        { name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: p.name, path: meta.path! },
      ])}</div></body></html>`;
      expect(html).toContain(`<title>${EXPECTED[p.name as keyof typeof EXPECTED].title}</title>`);
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type":"FAQPage"');
      expect(html).toContain('"@type":"Product"');
      expect((html.match(/<h1[\s>]/g) || []).length).toBe(1);
    }
  });
});
