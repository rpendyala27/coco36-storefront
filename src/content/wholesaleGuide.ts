import type { BakingNote } from './bakingNotes.js';
import { businessDayPhrase, DEFAULT_POLICY, dispatchWindow, type StorePolicy } from '../seo/site.js';

/**
 * /guides/how-to-buy-wholesale-baking-ingredients-india
 * Payment wording is the approved trade terms. Dispatch days come from the
 * India delivery zone (fallback DISPATCH_WINDOW), never a typed 2–4.
 */

export const WHOLESALE_GUIDE_PATH = '/guides/how-to-buy-wholesale-baking-ingredients-india';

/** Fits the site description limit (the source draft was 156, two over). */
export const WHOLESALE_GUIDE_DESCRIPTION =
  'How wholesale ordering works at COCO36: enquire, trial pack, first order, scale up. For bakeries, cafés and chocolatiers in India, from early December.';

export function wholesaleDispatchSentence(policy: Pick<StorePolicy, 'handlingDays'> = DEFAULT_POLICY): string {
  return `We dispatch orders within ${businessDayPhrase(dispatchWindow(policy))}; bulk and trade orders take 2–3 weeks.`;
}

/** Approved payment terms. Same sentences on the guide, the FAQ, and the trade strip. */
export const WHOLESALE_PAYMENT =
  'Pay in full when you place the order, for your first orders. Credit only if agreed in writing later, once there is a trading history. This page does not by itself grant credit. The quote will state the payment terms that apply to that order.';

/** No kilogram figures. The quote states the minimum and the trial-pack size. */
export const WHOLESALE_MINIMUMS =
  'Minimum order quantities and trial pack sizes are confirmed on request with your quote.';

const TRIAL = 'Trial packs available once launch stock lands (from early December).';
const DISPATCH = wholesaleDispatchSentence();
const REPORT_DAYS = DEFAULT_POLICY.returnWindowDays;

export const WHOLESALE_GUIDE: BakingNote = {
  path: WHOLESALE_GUIDE_PATH,
  title: 'How to Buy Wholesale Baking Ingredients in India | COCO36',
  description: WHOLESALE_GUIDE_DESCRIPTION,
  schemaDescription: WHOLESALE_GUIDE_DESCRIPTION,
  h1: 'How to buy wholesale baking ingredients in India',
  crumb: 'Wholesale ingredients',
  updated: '2026-11-10',
  sections: [
    {
      blocks: [
        { type: 'p', text: `Wholesale ordering at COCO36 works in four steps: enquire, then a trial pack, then a first order, then scale up. There are no free samples; ${TRIAL} Until the shop opens in the first week of December 2026, use the [Trade enquiry form](/trade#enquire) to tell us what you need.` },
        { type: 'p', text: 'This page is for bakeries, cafés, chocolatiers and pastry kitchens in India that want to buy baking ingredients at volume. It explains how an order is placed, what a trial pack is for, the minimum quantities, payment and how long delivery is expected to take. It is not a price list. Quotes are given on enquiry.' },
        { type: 'p', text: 'The [Trade page](/trade#enquire) is where you send the enquiry. This guide is the longer explainer; a short four-step summary on that page links back here.' },
      ],
    },
    {
      heading: 'The four steps',
      blocks: [
        { type: 'p', text: '**1. Enquire.** Tell us the products, the pack sizes you have in mind, and roughly how much you use. If you already have a GSTIN, a city and a sense of monthly volume, include those so the quote is faster. You can also ask for a spec sheet or a Certificate of Analysis before you commit to a lot, as described on the [Trade page](/trade).' },
        { type: 'p', text: `**2. Trial pack.** Once launch stock lands, you can buy a small paid pack and bake with it in your own kitchen. That is the point of the trial: to judge the ingredient in your recipes, on your equipment, before you take a full wholesale quantity. ${TRIAL}` },
        { type: 'p', text: '**3. First order.** After you have tried a pack, place a first wholesale order at the product minimum. We confirm the quantity, the pack format, taxes and delivery in the quote before you pay.' },
        { type: 'p', text: '**4. Scale up.** When the first lot works, move to larger, repeat or standing orders against your production calendar. Share a forecast if you have one, so we can plan consistent lots with you.' },
      ],
    },
    {
      heading: 'Minimum order',
      blocks: [
        { type: 'p', text: 'Minimums are set per product, not as one basket total.' },
        { type: 'p', text: WHOLESALE_MINIMUMS },
        { type: 'table', headers: ['Ingredient', 'First wholesale order', 'Notes'], rows: [
          ['Couverture', 'On request', 'Coming soon to the COCO36 shop. See the [couverture buying guide](/guides/best-couverture-chocolate-india) and [couverture vs compound](/guides/couverture-vs-compound).'],
          ['Dutch-process cocoa powder', 'On request', 'Coming soon to the COCO36 shop. COCO36 will stock Dutch-process cocoa only, not natural (non-alkalised) cocoa. See [natural (non-alkalised) vs Dutch-process cocoa](/guides/natural-vs-dutch-cocoa).'],
          ['Cocoa butter', 'On request', 'Coming soon to the COCO36 shop. This is mainly a trade item.'],
          ['Coconut sugar', 'On request', 'Coming soon to the COCO36 shop.'],
          ['Palm jaggery', 'On request', 'Coming soon to the COCO36 shop.'],
          ['Other products', 'On request', 'Ask in your enquiry.'],
        ] },
        { type: 'p', text: 'If you need several ingredients at once, the minimum still applies to each line, unless a quote says otherwise.' },
      ],
    },
    {
      heading: 'Trial packs',
      blocks: [
        { type: 'p', text: 'A trial pack is a paid, smaller pack so a kitchen can test an ingredient before a first wholesale order. It is not a free sample, and it is not credited against a later carton.' },
        { type: 'p', text: `${WHOLESALE_MINIMUMS} ${TRIAL}` },
        { type: 'h3', text: 'How to judge a trial pack' },
        { type: 'p', text: 'Use the pack in a recipe you already know, at a measured weight, so you are comparing the ingredient rather than a new formula.' },
        { type: 'ul', items: [
          'Check the pack itself: the name of the ingredient, the lot or batch mark if there is one, and the best-before or packaging date.',
          'For couverture, look at melt, flavour and how it behaves when you temper or make a ganache. A couverture ingredient list is built on cocoa mass, sugar and cocoa butter, not a named vegetable fat as the principal fat. The buying guide explains how to read a pack.',
          'For Dutch-process cocoa, bake a small batch you can compare with your usual cocoa — a brownie or a hot chocolate is enough — and note colour, flavour and how it mixes.',
          "For cocoa butter, melt a little and see how cleanly it melts and sets in your kitchen's temperature.",
          'For coconut sugar or palm jaggery, use it in a batter or syrup you already make, and check flavour, colour and how it dissolves.',
        ] },
        { type: 'p', text: 'If you requested a spec sheet or a Certificate of Analysis with your enquiry, read those alongside the bake, not instead of it.' },
      ],
    },
    {
      heading: 'What a wholesale quote covers',
      blocks: [
        { type: 'p', text: 'A trade quote is prepared for the products, pack sizes and quantities you asked for. We confirm packing, taxes and delivery in that quote before you pay. We do not publish wholesale rupee prices on this page; the figure that applies is the one on your quote.' },
        { type: 'p', text: 'On request, you can also receive a spec sheet and a Certificate of Analysis for a lot, along with origin provenance, before you commit, as already offered on the [Trade page](/trade). If you need those documents to qualify an ingredient, say so in the enquiry.' },
        { type: 'p', text: `Shipping, damage and returns follow the published [shipping](/shipping) and [returns](/returns) policies unless your quote states a different trade arrangement. Food items are not returnable for a change of mind. Damaged, wrong, missing, or expired or near-expiry items can be reported within ${REPORT_DAYS} days of delivery, as set out on the returns page.` },
      ],
    },
    {
      heading: 'Payment',
      blocks: [
        { type: 'p', text: WHOLESALE_PAYMENT },
      ],
    },
    {
      heading: 'Lead time',
      blocks: [
        { type: 'p', text: `${DISPATCH} After dispatch, courier transit times are the estimates on the [shipping policy](/shipping): 3 to 5 business days to metro cities, 5 to 8 business days to the rest of India, and up to 10 business days for remote areas. Those courier figures are estimates, not guarantees, and they are not a total time from order to door.` },
        { type: 'p', text: 'Wholesale and retail orders are not taken until the shop opens in the first week of December 2026.' },
      ],
    },
    {
      heading: 'After the first order',
      blocks: [
        { type: 'p', text: 'Once a first lot is in your kitchen, scale-up is about repeatability: the same specification, on a calendar you can plan around. You can ask for standing or scheduled orders, and for the same documentation on later lots. If your volume will grow or change with a season — for example a festival menu — say so in the next enquiry so the quote can take that into account.' },
        { type: 'p', text: 'If you are exploring a new product rather than buying the existing catalogue, that is a [Partnerships](/partnerships) conversation, not a standard wholesale order.' },
      ],
    },
  ],
  faqs: [
    { q: 'Can I get a free sample?', a: `No. There are no free samples. ${TRIAL} Those trial packs are paid. ${WHOLESALE_MINIMUMS}` },
    { q: 'What is the minimum order?', a: `${WHOLESALE_MINIMUMS} A paid trial pack comes before the first wholesale order.` },
    { q: 'When can I place a wholesale order?', a: `The shop opens in the first week of December 2026, and ordering is off until then. You can send a [Trade enquiry](/trade#enquire) now. ${TRIAL}` },
    { q: 'How do I pay?', a: WHOLESALE_PAYMENT },
    { q: 'How long does delivery take?', a: `${DISPATCH} Courier transit after dispatch follows the estimates on the shipping policy. The lead time on your quote is the one to rely on for that order.` },
    { q: 'Do you supply couverture and Dutch-process cocoa now?', a: 'Couverture and Dutch-process cocoa powder are coming soon to the COCO36 shop, as are cocoa butter, coconut sugar and palm jaggery. Send an enquiry if those are the lines you want to plan around.' },
  ],
  closing: [
    {
      blocks: [
        { type: 'p', text: 'To start, send a [Trade enquiry](/trade#enquire). For the wider baking guides, see [Guides](/guides).' },
      ],
    },
  ],
  related: [
    { href: '/trade#enquire', label: 'Trade enquiry' },
    { href: '/guides', label: 'Guides' },
    { href: '/shipping', label: 'Shipping' },
    { href: '/returns', label: 'Returns' },
  ],
};

/** Same page, with the live handling_days sentence when it differs from the fallback. */
export function wholesaleGuide(policy: Pick<StorePolicy, 'handlingDays'> = DEFAULT_POLICY): BakingNote {
  const sentence = wholesaleDispatchSentence(policy);
  if (sentence === DISPATCH) return WHOLESALE_GUIDE;
  const swap = (text: string) => text.split(DISPATCH).join(sentence);
  return {
    ...WHOLESALE_GUIDE,
    sections: WHOLESALE_GUIDE.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => (block.type === 'p' ? { ...block, text: swap(block.text) } : block)),
    })),
    faqs: WHOLESALE_GUIDE.faqs.map((faq) => ({ ...faq, a: swap(faq.a) })),
  };
}
