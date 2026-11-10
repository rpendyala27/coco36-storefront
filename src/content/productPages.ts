import type { Product, ProductSize } from '../types';
import { productSlug } from '../lib/productPath.js';
import { rupees } from '../seo/site.js';
import { DESCRIPTION_MAX, firstComplete } from '../seo/text.js';

/**
 * Editorial overlay for four thin product URLs. The catalogue (Supabase)
 * remains the source of name, brand, origin, images, prices and stock —
 * nothing here is written back to the database. Prices and in-stock state
 * are read off the product passed in, so a restock or a price change shows
 * up without editing this file.
 *
 * Titles, intros and FAQs are complete strings. Meta descriptions are chosen
 * from complete candidates that fit the site limit. They are never clipped
 * mid-sentence.
 *
 * Keyed by the canonical name slug (`/shop/<slug>`). No GTIN, MPN, review,
 * rating, restock date, pack photo, flour species or starter weight is
 * invented here.
 */

export interface ProductFaq { q: string; a: string }
export interface ProductSection { heading: string; paragraphs: string[] }
export interface ProductLink { href: string; label: string }
export interface ProductProperty { name: string; value: string }

export interface ProductPageCopy {
  slug: string;
  title: string;
  h1: string;
  /** Already within DESCRIPTION_MAX. Complete sentences only. */
  metaDescription: string;
  intro: string[];
  sections: ProductSection[];
  faqs: ProductFaq[];
  /** Named pack contents. Empty when we cannot list them from the live page. */
  properties: ProductProperty[];
  related: ProductLink[];
}

const LIGHT_DARK = 'Light muscovado has a toffee, butterscotch flavour; dark muscovado has more molasses, a stickier texture and a deeper, slightly bitter taste.';
const SOFTEN = 'Seal it in a jar with a slice of bread or a piece of apple for a day, or warm it very briefly, then store it airtight.';

const FLOURS = '/ingredients/flours';
const SUGARS = '/ingredients/sugars-jaggery';
const SALT = '/ingredients/spices-salt';
const DARK = '/shop/dark-muscovado-cane-sugar';
const LIGHT = '/shop/light-muscovado-cane-sugar';
const MALDON = '/shop/maldon-flaky-sea-salt';

function meta(options: string[]): string {
  return firstComplete(options, DESCRIPTION_MAX);
}

function minRupees(p: Product): string | undefined {
  if (!p.sizes.length) return undefined;
  return rupees(Math.min(...p.sizes.map((s) => s.priceInPaise)));
}

/** "Ships across India; currently out of stock." / "in stock." / a per-size list. */
function shipsTail(sizes: readonly ProductSize[]): string {
  if (!sizes.length) return 'Ships across India.';
  const stocked = sizes.filter((s) => s.inStock).length;
  if (stocked === 0) return 'Ships across India; currently out of stock.';
  if (stocked === sizes.length) return 'Ships across India; in stock.';
  const bits = sizes.map((s) => `${s.label} ${s.inStock ? 'in stock' : 'out of stock'}`);
  return `${bits.join('; ')}. Ships across India.`;
}

function stockPhrase(size: ProductSize): string {
  return size.inStock ? 'in stock' : 'currently out of stock';
}

function bothOrAll(sizes: readonly ProductSize[]): string {
  if (!sizes.length) return '';
  const stocked = sizes.filter((s) => s.inStock).length;
  const n = sizes.length;
  if (stocked === n) {
    if (n === 1) return 'It is in stock.';
    return n === 2 ? 'Both are in stock.' : 'All are in stock.';
  }
  if (stocked === 0) {
    if (n === 1) return 'It is currently out of stock.';
    return n === 2 ? 'Both are currently out of stock.' : 'All are currently out of stock.';
  }
  return `${sizes.map((s) => `${s.label} is ${stockPhrase(s)}`).join('; ')}.`;
}

function sizeList(sizes: readonly ProductSize[]): string {
  const parts = sizes.map((s) => `${s.label} at ${rupees(s.priceInPaise)}`);
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function countSizes(n: number): string {
  if (n === 1) return 'one size';
  if (n === 2) return 'two sizes';
  return `${n} sizes`;
}

/** "The 250 g pack is ₹623 and is in stock; the 1 kg pack is …" */
function packStatus(sizes: readonly ProductSize[]): string {
  if (!sizes.length) return '';
  const bits = sizes.map((s) => `the ${s.label} pack is ${rupees(s.priceInPaise)} and is ${stockPhrase(s)}`);
  bits[0] = bits[0].charAt(0).toUpperCase() + bits[0].slice(1);
  return `${bits.join('; ')}.`;
}

function listedStatus(sizes: readonly ProductSize[]): string {
  return sizes.map((s) => `${s.label} is listed at ${rupees(s.priceInPaise)} and is ${stockPhrase(s)}`).join('; ');
}

function kitListed(sizes: readonly ProductSize[]): string {
  if (sizes.length === 1) {
    const s = sizes[0];
    return `It is listed at ${rupees(s.priceInPaise)} and is ${stockPhrase(s)}.`;
  }
  return packStatus(sizes);
}

function heritage(p: Product): ProductPageCopy {
  const sizes = p.sizes;
  const price = minRupees(p);
  const listed = kitListed(sizes);
  const stock = sizes.length === 1
    ? (sizes[0].inStock ? ' In stock.' : ' Currently out of stock.')
    : '';
  const priceBit = price && sizes.length === 1
    ? `${price}, ships across India.${stock}`
    : shipsTail(sizes);
  const whenBack = sizes.some((s) => s.inStock)
    ? 'You can order it from this page. Shipping times and fees are on the [shipping](/shipping) page.'
    : 'This page shows the live price and when it can be ordered again. It does not give a restock date.';
  const orderLine = sizes.some((s) => s.inStock)
    ? 'You can order it from this page and we ship across India.'
    : 'When it is back in stock, you can order it from this page and we ship across India.';

  return {
    slug: 'heritage-sourdough-kit',
    title: 'Heritage Sourdough Starter Kit | COCO36',
    h1: 'Heritage sourdough starter kit',
    metaDescription: meta([
      `Living sourdough starter from a 100-year SF culture, with heritage flour and a banneton. ${priceBit}`,
      'Living sourdough starter from a 100-year SF culture, with heritage flour and a banneton. Ships across India.',
    ]),
    intro: [
      `This heritage sourdough starter kit pairs a living starter from a 100-year SF culture with a heritage flour blend and a banneton, so you can mix, ferment and proof sourdough at home in India.${listed ? ` ${listed}` : ''}`,
      `The kit is not a jar-and-tools set. The live page lists three things: the living starter, the flour blend and a banneton (a proofing basket for the loaf's final rise). ${orderLine} For flour types and how speciality flours behave in dough, see the [speciality flours guide](/ingredients/flours). Other kits sit in [Mixes & Kits](/shop/category/mixes-kits).`,
    ],
    sections: [
      {
        heading: 'What is in the kit',
        paragraphs: [
          'A living sourdough starter from a 100-year SF culture, a heritage flour blend, and a banneton. The live page does not list any other components.',
        ],
      },
      {
        heading: 'How it differs from a jar-and-tools kit',
        paragraphs: [
          'Most pages competing for "sourdough starter kit" sell empty jars, spatulas and feeding bands, and you still have to start or buy a culture. This kit is a living culture plus flour and a proofing basket.',
        ],
      },
      {
        heading: 'Price and availability',
        paragraphs: [
          listed ? `${listed} ${whenBack}` : whenBack,
        ],
      },
    ],
    faqs: [
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
        a: 'A banneton is a basket used for the dough\'s final rise. It helps the loaf hold its shape before it goes into the oven.',
      },
      {
        q: 'Is the kit in stock?',
        a: listed
          ? `${listed} ${sizes.some((s) => s.inStock) ? 'You can order it from this page.' : 'This page will show when it is available again.'}`
          : 'Check this page for the live price and whether it can be ordered.',
      },
      {
        q: 'Do I need other flour besides the blend in the kit?',
        a: 'The kit includes a heritage flour blend. Many bakers also keep a bag of their usual bread flour or atta for feeding and for larger batches. See the [speciality flours guide](/ingredients/flours) for how different flours behave.',
      },
      {
        q: 'Do you ship the kit across India?',
        a: 'Yes, when it is in stock. Shipping times, fees and what to do if something arrives damaged are on the [shipping](/shipping) and [returns](/returns) pages.',
      },
    ],
    properties: [
      { name: 'Contents', value: 'Living sourdough starter from a 100-year SF culture' },
      { name: 'Contents', value: 'Heritage flour blend' },
      { name: 'Contents', value: 'Banneton' },
    ],
    related: [
      { href: FLOURS, label: 'Speciality flours guide' },
      { href: '/shop/category/mixes-kits', label: 'Mixes & Kits' },
      { href: '/shop', label: 'Shop' },
    ],
  };
}

function maldon(p: Product): ProductPageCopy {
  const sizes = p.sizes;
  const from = minRupees(p);
  const lead = 'Maldon pyramid sea-salt flakes from Essex, England, for finishing chocolate, caramel and bread.';
  const listed = sizes.length
    ? `COCO36 lists ${countSizes(sizes.length)}: ${sizeList(sizes)}. ${bothOrAll(sizes)}`
    : 'Both listed sizes are shown on this page with their live prices.';
  const sameSalt = sizes.length
    ? `Same salt, ${countSizes(sizes.length)}. ${sizes.map((s, i) => (i === 0 ? `${s.label} is listed at ${rupees(s.priceInPaise)}` : `${s.label} at ${rupees(s.priceInPaise)}`)).join(' and ')}. ${bothOrAll(sizes)}`
    : 'This page lists the sizes and the live price of each.';
  const sizeQuestion = sizes.length === 2
    ? `What is the difference between the ${sizes[0].label} and ${sizes[1].label} packs?`
    : 'What is the difference between the pack sizes?';
  const ingredientLine = sizes.some((s) => /\b250\b/.test(s.label))
    ? 'the 250 g pack lists the ingredient as sea salt flakes'
    : 'the packs list the ingredient as sea salt flakes';

  return {
    slug: 'maldon-flaky-sea-salt',
    title: 'Maldon Flaky Sea Salt in India | COCO36',
    h1: 'Maldon flaky sea salt',
    metaDescription: meta([
      from ? `${lead} From ${from}. ${shipsTail(sizes)}` : `${lead} ${shipsTail(sizes)}`,
      from ? `${lead} From ${from}. Ships across India.` : `${lead} Ships across India.`,
      `${lead} Ships across India.`,
    ]),
    intro: [
      `Maldon flaky sea salt is the pyramid-shaped sea-salt flake made in Maldon, Essex, England, and it is used as a finishing salt on chocolate, caramel, bread and other bakes where you want a clean salt taste and a delicate crunch. ${listed}`,
      `[Maldon's own site](https://maldonsalt.com/about-us/) describes the flakes as hand-harvested in Maldon since 1882, and ${ingredientLine}. Flakes are light and hollow, so they are a poor substitute for table salt if you measure by the spoon; in dough, measure salt by weight and keep the flakes for the top of the bake. The [spices and salt guide](/ingredients/spices-salt) explains the difference at more length.`,
    ],
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'Pyramid flakes from Maldon Salt Co., origin England, Essex. They are a finishing salt: a clean salt taste and a delicate crunch on the surface of a bake.',
        ],
      },
      {
        heading: 'How bakers use it',
        paragraphs: [
          'Finishing: a pinch on chocolate-chip cookies, salted caramel, brownies, focaccia or a loaf just out of the oven. In a dough or batter, use a fine salt and weigh it. Flakes dissolve unevenly and pack very differently in a spoon.',
        ],
      },
      {
        heading: 'Sizes',
        paragraphs: [maldonSizes(sizes)],
      },
      {
        heading: 'Storage',
        paragraphs: [
          'Keep it airtight, somewhere cool and dry, and away from steam. The [spices and salt guide](/ingredients/spices-salt) covers how to keep salt and spices fresh.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is flaky sea salt?',
        a: 'Flaky sea salt is salt in large, light, hollow crystals. Maldon\'s flakes are pyramid-shaped. They sit on the surface of food and give a crunch and a clean salt taste, which is why they are used to finish dishes rather than to season a whole dough.',
      },
      {
        q: 'Can I bake with Maldon flaky salt inside the dough?',
        a: 'You can, but measure it by weight. Flakes are much less dense than fine table salt, so a teaspoon of flakes is not the same amount of salt as a teaspoon of table salt. Many bakers use fine salt in the dough and keep Maldon for sprinkling on top.',
      },
      {
        q: sizeQuestion,
        a: sameSalt,
      },
      {
        q: 'Where is Maldon salt from?',
        a: 'The live catalogue lists Maldon Salt Co., origin England, Essex. The maker\'s site says the flakes are hand-harvested in the coastal town of Maldon.',
      },
      {
        q: 'How should I store flaky salt?',
        a: 'Keep it airtight, somewhere cool and dry, and away from steam. See the [spices and salt guide](/ingredients/spices-salt).',
      },
      {
        q: 'Do you ship Maldon salt across India?',
        a: 'Yes, when it is in stock. See [shipping](/shipping) and [returns](/returns) for timings, fees and what happens if a pack arrives damaged.',
      },
    ],
    properties: [],
    related: [
      { href: SALT, label: 'Spices and salt guide' },
      { href: '/shop/category/spices-pantry', label: 'Spices & Pantry' },
      { href: DARK, label: 'Dark muscovado cane sugar' },
    ],
  };
}

function maldonSizes(sizes: readonly ProductSize[]): string {
  if (!sizes.length) return 'Sizes and prices are listed on this page.';
  const prices = sizes.map((s) => `${s.label} (${rupees(s.priceInPaise)}, ${stockPhrase(s)})`).join('; ');
  const home = sizes.find((s) => /\b250\b/.test(s.label));
  const big = sizes.find((s) => /\b750\b/.test(s.label));
  const gloss = home && big
    ? ` ${home.label} suits a home tin; ${big.label} is the pack if you go through finishing salt faster.`
    : '';
  return `${prices}.${gloss}`;
}

function darkMuscovado(p: Product): ProductPageCopy {
  const sizes = p.sizes;
  const lead = 'Unrefined dark muscovado cane sugar from Mauritius, with more of its molasses left in.';
  const bits = sizes.map((s) => `${s.label} ${rupees(s.priceInPaise)} ${s.inStock ? 'in stock' : 'out of stock'}`).join('; ');
  const from = minRupees(p);
  const status = packStatus(sizes);

  return {
    slug: 'dark-muscovado-cane-sugar',
    title: 'Dark Muscovado Sugar in India | COCO36',
    h1: 'Dark muscovado cane sugar',
    metaDescription: meta([
      bits ? `${lead} ${bits}. Ships across India.` : `${lead} Ships across India.`,
      from ? `${lead} From ${from}. Ships across India.` : `${lead} Ships across India.`,
      `${lead} Ships across India.`,
    ]),
    intro: [
      `Dark muscovado is an unrefined cane sugar that keeps more of its molasses, so it is stickier, darker and deeper in flavour than light muscovado or ordinary brown sugar. This COCO36 sugar is from ${p.brand || 'Mauritius Sugar Estate'}, stone-ground in small batches.${status ? ` ${status}` : ''}`,
      'Use it where a molasses note helps — gingerbread, fruit cake, brownies, sticky toffee-style puddings, and some barbecue-style sauces. It is not the same as jaggery, and it is not white sugar with a little molasses added back. The [jaggery, muscovado and unrefined sugars guide](/ingredients/sugars-jaggery) sets the types side by side, including the difference between [light muscovado](/shop/light-muscovado-cane-sugar) and this dark one.',
    ],
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          `Unrefined cane sugar that keeps more of its molasses, stone-ground in small batches. The brand on this page is ${p.brand || 'Mauritius Sugar Estate'} and the origin is ${p.originCountry || 'Mauritius'}.`,
        ],
      },
      {
        heading: 'Dark, light, brown sugar and jaggery',
        paragraphs: [
          `${LIGHT_DARK} Jaggery is boiled cane juice or palm sap with none of the molasses removed. Many brown sugars are refined white sugar with some molasses added back. The [sugars guide](${SUGARS}) sets them side by side.`,
        ],
      },
      {
        heading: 'How to bake with it',
        paragraphs: [
          `Often one-for-one by weight with white or light brown sugar, but the bake will be darker, moister and more strongly flavoured. Weigh it, because packed spoons vary when the sugar is sticky. If it hardens, ${SOFTEN.charAt(0).toLowerCase()}${SOFTEN.slice(1)} That is the same method as the [sugars guide](${SUGARS}).`,
        ],
      },
      {
        heading: 'Sizes',
        paragraphs: [
          status
            ? `${status} This page does not give a restock date.`
            : 'Sizes and prices are listed on this page.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is dark muscovado sugar?',
        a: 'It is unrefined cane sugar that keeps more of its molasses, so it is darker, stickier and deeper in flavour than light muscovado. This one is from Mauritius and is described on the page as stone-ground in small batches.',
      },
      {
        q: 'What is the difference between light and dark muscovado?',
        a: `The amount of molasses. ${LIGHT_DARK} See the [sugars guide](${SUGARS}) and the [light muscovado](${LIGHT}) page.`,
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
        a: sizes.length
          ? `On this page, ${listedStatus(sizes)}. Re-check the page before ordering.`
          : 'Re-check this page for the live price and stock of each size.',
      },
      {
        q: 'How do I soften muscovado that has hardened?',
        a: `${SOFTEN} That is the same advice as on the [sugars guide](${SUGARS}).`,
      },
    ],
    properties: [],
    related: [
      { href: SUGARS, label: 'Jaggery, muscovado and unrefined sugars' },
      { href: LIGHT, label: 'Light muscovado cane sugar' },
      { href: '/shop/category/sugars-sweeteners', label: 'Sugars & Sweeteners' },
      { href: MALDON, label: 'Maldon flaky sea salt' },
    ],
  };
}

function lightMuscovado(p: Product): ProductPageCopy {
  const sizes = p.sizes;
  const lead = 'Unrefined light muscovado cane sugar from Mauritius, with caramel and molasses notes.';
  const priceBits = sizes.map((s) => `${s.label} ${rupees(s.priceInPaise)}`).join('; ');
  const from = minRupees(p);
  const status = sizes.length === 1
    ? `The ${sizes[0].label} pack is listed at ${rupees(sizes[0].priceInPaise)} and is ${stockPhrase(sizes[0])}.`
    : packStatus(sizes);
  const inStockAnswer = sizes.length === 1
    ? `It is listed at ${rupees(sizes[0].priceInPaise)} and is ${stockPhrase(sizes[0])}.`
    : (listedStatus(sizes) ? `${listedStatus(sizes)}.` : 'Re-check this page for the live price and stock.');

  return {
    slug: 'light-muscovado-cane-sugar',
    title: 'Light Muscovado Sugar in India | COCO36',
    h1: 'Light muscovado cane sugar',
    metaDescription: meta([
      priceBits ? `${lead} ${priceBits}. ${shipsTail(sizes)}` : `${lead} Ships across India.`,
      from ? `${lead} From ${from}. Ships across India.` : `${lead} Ships across India.`,
      `${lead} Ships across India.`,
    ]),
    intro: [
      `Light muscovado is an unrefined cane sugar with a gentler caramel and molasses flavour than dark muscovado. This COCO36 sugar is from ${p.brand || 'Mauritius Sugar Estate'}, stone-ground in small batches.${status ? ` ${status}` : ''}`,
      'If you want a milder toffee or butterscotch note in biscuits, blondies or a lighter cake, start here. For a deeper, stickier molasses flavour, use [dark muscovado](/shop/dark-muscovado-cane-sugar). The [sugars guide](/ingredients/sugars-jaggery) explains how light and dark muscovado differ, and how both differ from jaggery and ordinary brown sugar.',
    ],
    sections: [],
    faqs: [
      {
        q: 'What is light muscovado sugar?',
        a: 'It is unrefined cane sugar with a gentler caramel and molasses flavour than the dark style. This one is from Mauritius and is described on the page as stone-ground in small batches.',
      },
      {
        q: 'When should I use light muscovado instead of dark?',
        a: 'Use light muscovado when you want a toffee or butterscotch note without the deeper, slightly bitter taste of the darker sugar. Use dark muscovado in gingerbread, fruit cake and other bakes that can carry more molasses.',
      },
      {
        q: sizes.length === 1 ? `Is the ${sizes[0].label} pack in stock?` : 'Which packs are in stock?',
        a: `${inStockAnswer} The [dark muscovado 250 g](${DARK}) pack may still be available; check that page for the live status.`,
      },
      {
        q: 'Can I swap light muscovado for white sugar?',
        a: 'Often one for one by weight, with a slightly darker colour and a caramel note. Weigh it, because the crystals are moist and pack unevenly in a spoon.',
      },
      {
        q: 'How do I store it?',
        a: `Airtight, in a cool, dry place. If it hardens, ${SOFTEN.charAt(0).toLowerCase()}${SOFTEN.slice(1)}`,
      },
      {
        q: 'Do you ship it across India?',
        a: 'Yes, when it is in stock. See [shipping](/shipping) and [returns](/returns).',
      },
    ],
    properties: [],
    related: [
      { href: SUGARS, label: 'Jaggery, muscovado and unrefined sugars' },
      { href: DARK, label: 'Dark muscovado cane sugar' },
      { href: '/shop/category/sugars-sweeteners', label: 'Sugars & Sweeteners' },
      { href: MALDON, label: 'Maldon flaky sea salt' },
    ],
  };
}

const BUILDERS: Record<string, (p: Product) => ProductPageCopy> = {
  'heritage-sourdough-kit': heritage,
  'maldon-flaky-sea-salt': maldon,
  'dark-muscovado-cane-sugar': darkMuscovado,
  'light-muscovado-cane-sugar': lightMuscovado,
};

export const PRODUCT_PAGE_SLUGS = Object.keys(BUILDERS);

/** Editorial copy for this product, or undefined when the page uses the catalogue text. */
export function productPage(p: { id: string; name?: string | null; sizes: ProductSize[]; originCountry?: string; brand?: string }): ProductPageCopy | undefined {
  const build = BUILDERS[productSlug(p)];
  return build ? build(p as Product) : undefined;
}
