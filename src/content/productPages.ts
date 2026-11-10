import type { Product, ProductSize } from '../types';
import { visibleCopy } from './linkify.js';
import { productSlug } from '../lib/productPath.js';
import type { CategoryTree } from '../lib/categoryTree.js';
import { faqJsonLd, productJsonLd } from '../seo/jsonld.js';
import { productMeta, type PageMeta } from '../seo/meta.js';
import { type StorePolicy, rupees } from '../seo/site.js';
import { DESCRIPTION_MAX, fitWithin } from '../seo/text.js';

/**
 * Editorial copy for four thin product URLs. The catalogue row (name, brand,
 * origin, price, stock, image, the one-line description_md) stays in the
 * database and is not written from here. Titles, intros, sections and FAQs
 * are overlaid in code so a preview can ship without a Shopkeeper write.
 *
 * Prices and in-stock / out-of-stock wording are filled from the product's
 * live sizes. The sentences match the 10 Nov 2026 brief when the catalogue
 * still shows those prices and that stock.
 *
 * FAQ answers are the same strings the FAQPage JSON-LD uses (`visibleCopy`
 * strips `{label|url}` down to the label a visitor reads).
 */

export interface ProductFaq { q: string; a: string }
export interface ProductSection { heading: string; paragraphs: string[] }
export interface ProductLink { href: string; label: string }

export interface ProductPageCopy {
  slug: string;
  title: string;
  h1: string;
  /** Plain meta description, already within the site limit when prices match the brief. */
  meta: (p: Product) => string;
  intro: (p: Product) => string[];
  sections: (p: Product) => ProductSection[];
  faqs: (p: Product) => ProductFaq[];
  links: ProductLink[];
  /** Pack contents the catalogue description already names. Not a guess. */
  contents?: string;
}

const stock = (inStock: boolean) => (inStock ? 'in stock' : 'currently out of stock');
const allOut = (p: Product) => p.sizes.length > 0 && p.sizes.every((s) => !s.inStock);
const allIn = (p: Product) => p.sizes.length > 0 && p.sizes.every((s) => s.inStock);

function priceOf(s: ProductSize | undefined): string {
  return s ? rupees(s.priceInPaise) : 'the listed price';
}

function bothStock(p: Product): string {
  if (allOut(p)) return p.sizes.length === 2 ? 'Both are currently out of stock.' : 'All are currently out of stock.';
  if (allIn(p)) return p.sizes.length === 2 ? 'Both are in stock.' : 'All are in stock.';
  return p.sizes.map((s) => `${s.label} is ${stock(s.inStock)}.`).join(' ');
}

const KIT_CONTENTS = 'Living sourdough starter from a 100-year SF culture; heritage flour blend; banneton';

const PAGES: ProductPageCopy[] = [
  {
    slug: 'heritage-sourdough-kit',
    title: 'Heritage Sourdough Starter Kit | COCO36',
    h1: 'Heritage sourdough starter kit',
    contents: KIT_CONTENTS,
    meta: (p) => {
      const s = p.sizes[0];
      const out = !s || !s.inStock;
      return `Living sourdough starter from a 100-year SF culture, with heritage flour and a banneton. ${priceOf(s)}, ships across India. ${out ? 'Currently out of stock.' : 'In stock.'}`;
    },
    intro: (p) => {
      const s = p.sizes[0];
      const out = !s || !s.inStock;
      const order = out
        ? 'When it is back in stock, you can order it from this page and we ship across India.'
        : 'It is in stock, so you can order it from this page and we ship across India.';
      return [
        `This heritage sourdough starter kit pairs a living starter from a 100-year SF culture with a heritage flour blend and a banneton, so you can mix, ferment and proof sourdough at home in India. It is listed at ${priceOf(s)} and is ${stock(Boolean(s?.inStock))}.`,
        `The kit is not a jar-and-tools set. The live page lists three things: the living starter, the flour blend and a banneton (a proofing basket for the loaf's final rise). ${order} For flour types and how speciality flours behave in dough, see the {speciality flours guide|/ingredients/flours}. Other kits sit in {Mixes & Kits|/shop/category/mixes-kits}.`,
      ];
    },
    sections: (p) => {
      const s = p.sizes[0];
      const out = !s || !s.inStock;
      return [
        {
          heading: "What's in the kit",
          paragraphs: [
            'A living sourdough starter from a 100-year SF culture, a heritage flour blend, and a banneton. The page does not list jar sizes, flour species, a starter weight or a feeding schedule.',
          ],
        },
        {
          heading: 'How it differs from a jar-and-tools kit',
          paragraphs: [
            'Most pages competing for "sourdough starter kit" sell empty jars, spatulas and feeding bands. This one is a living culture plus flour and a proofing basket.',
          ],
        },
        {
          heading: out ? 'When it is back in stock' : 'Availability',
          paragraphs: [
            out
              ? `The kit is listed at ${priceOf(s)} and is currently out of stock. There is no published restock date. This page shows the live price, and it will show when the kit is available again.`
              : `The kit is listed at ${priceOf(s)} and is in stock. You can order it from this page. We ship across India.`,
          ],
        },
      ];
    },
    faqs: (p) => {
      const s = p.sizes[0];
      const out = !s || !s.inStock;
      return [
        {
          q: 'What is in the heritage sourdough starter kit?',
          a: 'A living sourdough starter from a 100-year SF culture, a heritage flour blend, and a banneton. The live page does not list any other components.',
        },
        {
          q: 'Is this the same as the jar-and-tools kits sold as "sourdough starter kits"?',
          a: 'No. Those kits are usually a jar, a scraper and a feeding band, and you still have to start or buy a culture. This kit is a living starter with flour and a proofing basket.',
        },
        {
          q: 'What is a banneton for?',
          a: "A banneton is a basket used for the dough's final rise. It helps the loaf hold its shape before it goes into the oven.",
        },
        {
          q: 'Is the kit in stock?',
          a: out
            ? `It is listed at ${priceOf(s)} and is currently out of stock. This page will show when it is available again.`
            : `It is listed at ${priceOf(s)} and is in stock. You can order it from this page.`,
        },
        {
          q: 'Do I need other flour besides the blend in the kit?',
          a: 'The kit includes a heritage flour blend. Many bakers also keep a bag of their usual bread flour or atta for feeding and for larger batches. See the {speciality flours guide|/ingredients/flours} for how different flours behave.',
        },
        {
          q: 'Do you ship the kit across India?',
          a: 'Yes, when it is in stock. Shipping times, fees and what to do if something arrives damaged are on the {shipping|/shipping} and {returns|/returns} pages.',
        },
      ];
    },
    links: [
      { href: '/ingredients/flours', label: 'Speciality flours guide' },
      { href: '/shop/category/mixes-kits', label: 'Mixes & Kits' },
      { href: '/shop', label: 'Shop' },
    ],
  },
  {
    slug: 'maldon-flaky-sea-salt',
    title: 'Maldon Flaky Sea Salt in India | COCO36',
    h1: 'Maldon flaky sea salt',
    meta: (p) => {
      const prices = p.sizes.map((s) => s.priceInPaise);
      const from = prices.length ? `From ${rupees(Math.min(...prices))}` : 'See this page for the price';
      const availability = !p.sizes.length || allOut(p)
        ? 'currently out of stock'
        : allIn(p)
          ? 'in stock'
          : 'see each size for availability';
      return `Maldon pyramid sea-salt flakes from Essex, England, for finishing chocolate, caramel and bread. ${from}. Ships across India; ${availability}.`;
    },
    intro: (p) => {
      const [a, b] = p.sizes;
      const sizes = p.sizes.length === 2
        ? `COCO36 lists two sizes: ${a.label} at ${rupees(a.priceInPaise)} and ${b.label} at ${rupees(b.priceInPaise)}. ${bothStock(p)}`
        : p.sizes.length === 1
          ? `COCO36 lists ${a.label} at ${rupees(a.priceInPaise)}. It is ${stock(a.inStock)}.`
          : 'Sizes and prices are listed on this page.';
      return [
        `Maldon flaky sea salt is the pyramid-shaped sea-salt flake made in Maldon, Essex, England, and it is used as a finishing salt on chocolate, caramel, bread and other bakes where you want a clean salt taste and a delicate crunch. ${sizes}`,
        "{Maldon's own site|https://maldonsalt.com/about-us/} describes the flakes as hand-harvested in Maldon since 1882, and the 250 g pack lists the ingredient as sea salt flakes. Flakes are light and hollow, so they are a poor substitute for table salt if you measure by the spoon; in dough, measure salt by weight and keep the flakes for the top of the bake. The {spices and salt guide|/ingredients/spices-salt} explains the difference at more length.",
      ];
    },
    sections: (p) => {
      const [a, b] = p.sizes;
      const sizeLine = p.sizes.length === 2
        ? `${a.label} (${rupees(a.priceInPaise)}) for a home tin; ${b.label} (${rupees(b.priceInPaise)}) if you go through finishing salt faster. ${bothStock(p)}`
        : p.sizes.map((s) => `${s.label} is ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}.`).join(' ');
      return [
        {
          heading: 'What it is',
          paragraphs: [
            'Pyramid flakes from Maldon Salt Co., origin England, Essex. They are a finishing salt.',
          ],
        },
        {
          heading: 'How bakers use it',
          paragraphs: [
            'Finishing: a pinch on chocolate-chip cookies, salted caramel, brownies, focaccia or a loaf just out of the oven. In a dough or batter, use a fine salt and weigh it; flakes dissolve unevenly and pack very differently in a spoon.',
          ],
        },
        {
          heading: 'Sizes',
          paragraphs: [sizeLine || 'Sizes and prices are listed on this page.'],
        },
        {
          heading: 'Storage',
          paragraphs: [
            'Keep it airtight, somewhere cool and dry, and away from steam. The {spices and salt guide|/ingredients/spices-salt} covers how to store it. This page does not state a shelf life.',
          ],
        },
      ];
    },
    faqs: (p) => {
      const [a, b] = p.sizes;
      const sizeAnswer = p.sizes.length === 2
        ? `Same salt, two sizes. ${a.label} is listed at ${rupees(a.priceInPaise)} and ${b.label} at ${rupees(b.priceInPaise)}. ${bothStock(p)}`
        : `Same salt. ${p.sizes.map((s) => `${s.label} is listed at ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}`).join('; ') || 'See the sizes on this page.'}`;
      return [
        {
          q: 'What is flaky sea salt?',
          a: "Flaky sea salt is salt in large, light, hollow crystals. Maldon's flakes are pyramid-shaped. They sit on the surface of food and give a crunch and a clean salt taste, which is why they are used to finish dishes rather than to season a whole dough.",
        },
        {
          q: 'Can I bake with Maldon flaky salt inside the dough?',
          a: 'You can, but measure it by weight. Flakes are much less dense than fine table salt, so a teaspoon of flakes is not the same amount of salt as a teaspoon of table salt. Many bakers use fine salt in the dough and keep Maldon for sprinkling on top.',
        },
        {
          q: 'What is the difference between the 250 g and 750 g packs?',
          a: sizeAnswer,
        },
        {
          q: 'Where is Maldon salt from?',
          a: "The live catalogue lists Maldon Salt Co., origin England, Essex. The maker's site says the flakes are hand-harvested in the coastal town of Maldon.",
        },
        {
          q: 'How should I store flaky salt?',
          a: 'Keep it airtight, somewhere cool and dry, and away from steam. See the {spices and salt guide|/ingredients/spices-salt}.',
        },
        {
          q: 'Do you ship Maldon salt across India?',
          a: 'Yes, when it is in stock. See {shipping|/shipping} and {returns|/returns} for timings, fees and what happens if a pack arrives damaged.',
        },
      ];
    },
    links: [
      { href: '/ingredients/spices-salt', label: 'Spices and salt guide' },
      { href: '/shop/category/spices-pantry', label: 'Spices & Pantry' },
      { href: '/shop/dark-muscovado-cane-sugar', label: 'Dark muscovado cane sugar' },
    ],
  },
  {
    slug: 'dark-muscovado-cane-sugar',
    title: 'Dark Muscovado Sugar in India | COCO36',
    h1: 'Dark muscovado cane sugar',
    meta: (p) => {
      const bits = p.sizes.map((s) => `${s.label} ${rupees(s.priceInPaise)} ${s.inStock ? 'in stock' : 'out of stock'}`).join('; ');
      const sizes = bits ? `${bits}. ` : '';
      return `Unrefined dark muscovado cane sugar from Mauritius, with more of its molasses left in. ${sizes}Ships across India.`;
    },
    intro: (p) => {
      const packs = p.sizes.length
        ? `${p.sizes.map((s, i) => `${i === 0 ? 'The' : 'the'} ${s.label} pack is ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}`).join('; ')}.`
        : 'Prices and availability are shown on this page.';
      return [
        `Dark muscovado is an unrefined cane sugar that keeps more of its molasses, so it is stickier, darker and deeper in flavour than light muscovado or ordinary brown sugar. This COCO36 sugar is from Mauritius Sugar Estate, stone-ground in small batches. ${packs}`,
        'Use it where a molasses note helps — gingerbread, fruit cake, brownies, sticky toffee-style puddings, and some barbecue-style sauces. It is not the same as jaggery, and it is not white sugar with a little molasses added back. The {jaggery, muscovado and unrefined sugars guide|/ingredients/sugars-jaggery} sets the types side by side, including the difference between {light muscovado|/shop/light-muscovado-cane-sugar} and this dark one.',
      ];
    },
    sections: (p) => [
      {
        heading: 'What it is',
        paragraphs: [
          'Unrefined cane sugar that keeps more of its molasses, stone-ground in small batches. The brand on this page is Mauritius Sugar Estate and the origin is Mauritius.',
        ],
      },
      {
        heading: 'Dark, light, brown sugar and jaggery',
        paragraphs: [
          'Light muscovado has a toffee, butterscotch flavour; dark muscovado has more molasses, a stickier texture and a deeper, slightly bitter taste. Jaggery is boiled cane juice or palm sap with none of the molasses removed. Many brown sugars are refined white sugar with some molasses added back. The {jaggery, muscovado and unrefined sugars guide|/ingredients/sugars-jaggery} sets the types side by side.',
        ],
      },
      {
        heading: 'How to bake with it',
        paragraphs: [
          'Often one-for-one by weight with white or light brown sugar, but the bake will be darker, moister and more strongly flavoured. Weigh it; packed spoons vary because it is sticky. If it hardens, seal it in a jar with a slice of bread or a piece of apple for a day, or warm it very briefly, then store it airtight. That is the method already on the {sugars guide|/ingredients/sugars-jaggery}.',
        ],
      },
      {
        heading: 'Sizes',
        paragraphs: [
          p.sizes.length
            ? `${p.sizes.map((s) => `${s.label} is ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}`).join('; ')}. There is no published restock date for a size that is out of stock.`
            : 'Sizes and prices are listed on this page.',
        ],
      },
    ],
    faqs: (p) => [
      {
        q: 'What is dark muscovado sugar?',
        a: 'It is unrefined cane sugar that keeps more of its molasses, so it is darker, stickier and deeper in flavour than light muscovado. This one is from Mauritius and is described on the page as stone-ground in small batches.',
      },
      {
        q: 'What is the difference between light and dark muscovado?',
        a: 'The amount of molasses. Light muscovado has a toffee, butterscotch flavour; dark muscovado has more molasses, a stickier texture and a deeper, slightly bitter taste. See the {sugars guide|/ingredients/sugars-jaggery} and the {light muscovado|/shop/light-muscovado-cane-sugar} page.',
      },
      {
        q: 'Can I use dark muscovado instead of white sugar?',
        a: 'Often one for one by weight, but it will make bakes darker, moister and more strongly flavoured. It works best where those qualities help, as in gingerbread, brownies and fruit cakes.',
      },
      {
        q: 'Is muscovado the same as jaggery?',
        a: 'No. Jaggery is made by boiling cane juice or palm sap until it sets, with none of the molasses removed. Muscovado is a moist, unrefined cane sugar that still holds a lot of molasses, but it is a crystallised sugar, not a set block.',
      },
      {
        q: 'Which sizes are in stock?',
        a: `On this page, ${p.sizes.map((s) => `${s.label} is listed at ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}`).join('; ') || 'sizes are listed with their prices'}. Re-check the page before ordering.`,
      },
      {
        q: 'How do I soften muscovado that has hardened?',
        a: 'Seal it in a jar with a slice of bread or a piece of apple for a day, or warm it very briefly, then store it airtight. That is the same advice as on the {sugars guide|/ingredients/sugars-jaggery}.',
      },
    ],
    links: [
      { href: '/ingredients/sugars-jaggery', label: 'Jaggery, muscovado and unrefined sugars' },
      { href: '/shop/light-muscovado-cane-sugar', label: 'Light muscovado cane sugar' },
      { href: '/shop/category/sugars-sweeteners', label: 'Sugars & Sweeteners' },
      { href: '/shop/maldon-flaky-sea-salt', label: 'Maldon flaky sea salt' },
    ],
  },
  {
    slug: 'light-muscovado-cane-sugar',
    title: 'Light Muscovado Sugar in India | COCO36',
    h1: 'Light muscovado cane sugar',
    meta: (p) => {
      const s = p.sizes[0];
      const pack = s ? `${s.label} ${rupees(s.priceInPaise)}` : 'See this page for the price';
      const availability = !s || !s.inStock ? 'currently out of stock' : 'in stock';
      return `Unrefined light muscovado cane sugar from Mauritius, with caramel and molasses notes. ${pack}. Ships across India; ${availability}.`;
    },
    intro: (p) => {
      const s = p.sizes[0];
      const pack = s
        ? `The ${s.label} pack is listed at ${rupees(s.priceInPaise)} and is ${stock(s.inStock)}.`
        : 'The price and availability are shown on this page.';
      return [
        `Light muscovado is an unrefined cane sugar with a gentler caramel and molasses flavour than dark muscovado. This COCO36 sugar is from Mauritius Sugar Estate, stone-ground in small batches. ${pack}`,
        'If you want a milder toffee or butterscotch note in biscuits, blondies or a lighter cake, start here. For a deeper, stickier molasses flavour, use {dark muscovado|/shop/dark-muscovado-cane-sugar}. The {sugars guide|/ingredients/sugars-jaggery} explains how light and dark muscovado differ, and how both differ from jaggery and ordinary brown sugar.',
      ];
    },
    sections: () => [],
    faqs: (p) => {
      const s = p.sizes[0];
      const availability = !s || !s.inStock ? 'currently out of stock' : 'in stock';
      return [
        {
          q: 'What is light muscovado sugar?',
          a: 'It is unrefined cane sugar with a gentler caramel and molasses flavour than the dark style. This one is from Mauritius and is described on the page as stone-ground in small batches.',
        },
        {
          q: 'When should I use light muscovado instead of dark?',
          a: 'Use light muscovado when you want a toffee or butterscotch note without the deeper, slightly bitter taste of the darker sugar. Use dark muscovado in gingerbread, fruit cake and other bakes that can carry more molasses.',
        },
        {
          q: 'Is the 250 g pack in stock?',
          a: `It is listed at ${priceOf(s)} and is ${availability}. The {dark muscovado 250 g|/shop/dark-muscovado-cane-sugar} pack may still be available; check that page for the live status.`,
        },
        {
          q: 'Can I swap light muscovado for white sugar?',
          a: 'Often one for one by weight, with a slightly darker colour and a caramel note. Weigh it, because the crystals are moist and pack unevenly in a spoon.',
        },
        {
          q: 'How do I store it?',
          a: 'Airtight, in a cool, dry place. If it hardens, seal it in a jar with a slice of bread or a piece of apple for a day, or warm it very briefly, then store it airtight.',
        },
        {
          q: 'Do you ship it across India?',
          a: 'Yes, when it is in stock. See the {shipping|/shipping} and {returns|/returns} pages.',
        },
      ];
    },
    links: [
      { href: '/ingredients/sugars-jaggery', label: 'Jaggery, muscovado and unrefined sugars' },
      { href: '/shop/dark-muscovado-cane-sugar', label: 'Dark muscovado cane sugar' },
      { href: '/shop/category/sugars-sweeteners', label: 'Sugars & Sweeteners' },
      { href: '/shop/maldon-flaky-sea-salt', label: 'Maldon flaky sea salt' },
    ],
  },
];

const BY_SLUG = new Map(PAGES.map((p) => [p.slug, p]));

export const PRODUCT_PAGE_SLUGS = PAGES.map((p) => p.slug);

export function productPage(slug: string): ProductPageCopy | undefined {
  return BY_SLUG.get(slug);
}

export interface ResolvedProductPage {
  slug: string;
  title: string;
  h1: string;
  meta: string;
  intro: string[];
  sections: ProductSection[];
  faqs: ProductFaq[];
  links: ProductLink[];
  contents?: string;
}

/** Editorial overlay for this catalogue row, with prices and stock filled in. */
export function productPageFor(p: Product): ResolvedProductPage | undefined {
  const page = productPage(productSlug(p));
  if (!page) return undefined;
  const meta = page.meta(p);
  return {
    slug: page.slug,
    title: page.title,
    h1: page.h1,
    meta: meta.length <= DESCRIPTION_MAX ? meta : fitWithin(meta, DESCRIPTION_MAX),
    intro: page.intro(p),
    sections: page.sections(p),
    faqs: page.faqs(p),
    links: page.links,
    contents: page.contents,
  };
}

/** Product head, plus the editorial title, meta and FAQPage when this slug has one. */
export function productPageMeta(p: Product, tree: CategoryTree, policy?: StorePolicy): PageMeta {
  const base = productMeta(p, tree, policy);
  const page = productPageFor(p);
  if (!page) return base;
  const faqs = page.faqs.map((f) => ({ q: f.q, a: visibleCopy(f.a) }));
  const description = page.intro.map(visibleCopy).join(' ');
  return {
    ...base,
    title: page.title,
    description: page.meta,
    jsonLd: [
      { id: 'product', data: productJsonLd(p, { policy, description, contents: page.contents }) },
      ...base.jsonLd.filter((b) => b.id !== 'product'),
      { id: 'faq', data: faqJsonLd(faqs) },
    ],
  };
}
