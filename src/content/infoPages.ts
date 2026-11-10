import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../lib/supportContact.js';
import { HANDLING_DAYS_MAX, SHIPS_FROM, type StorePolicy } from '../seo/site.js';
import {
  businessDaysLine, cancellationLine, changeOfMindLine, contactLine, cutoffLine,
  deliveryEstimateLine, dispatchLine, emailReplyLine, refundLine, remedyLine,
  reportLine, returnsLine, serviceabilityLine, shippingPriceLine, supportHoursLine,
  trackingLine, transitLossLine,
} from './orderFacts.js';

/**
 * Indexable info pages. Shipping, returns and contact copy is the owner's
 * decided wording. The only remaining placeholder is the /about company story.
 * /faq JSON-LD is built from `policyFaqs` and from nothing else.
 */

export interface InfoSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Owner-facing placeholder. Not a customer promise. */
  todo?: string;
}

export interface InfoLink { href: string; label: string }

export interface InfoPage {
  path: string;
  /** <title>, 50–59 characters. */
  title: string;
  description: (policy: StorePolicy) => string;
  crumb: string;
  eyebrow: string;
  h1: string;
  /** Prominent mailto + tel list. Contact page only. */
  showContactList?: boolean;
  sections: (policy: StorePolicy) => InfoSection[];
  faqs?: (policy: StorePolicy) => { q: string; a: string }[];
  related: InfoLink[];
}

const RELATED: InfoLink[] = [
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/returns', label: 'Returns' },
];

const relatedExcept = (path: string) => RELATED.filter((l) => l.href !== path);

/**
 * Questions the shipping and returns facts actually answer.
 * Visible FAQ and FAQPage JSON-LD both call this.
 */
export function policyFaqs(policy: StorePolicy): { q: string; a: string }[] {
  return [
    {
      q: 'Where do COCO36 orders ship from, and how soon do they leave?',
      a: `${dispatchLine()} ${businessDaysLine()} ${cutoffLine()} We ship across India.`,
    },
    {
      q: 'How much does shipping cost?',
      a: shippingPriceLine(policy),
    },
    {
      q: 'How long does delivery take after an order ships?',
      a: deliveryEstimateLine(),
    },
    {
      q: 'Do you deliver to every Indian pincode?',
      a: serviceabilityLine(),
    },
    {
      q: 'How do I track an order?',
      a: trackingLine(),
    },
    {
      q: 'What can I report after delivery?',
      a: reportLine(policy),
    },
    {
      q: 'Can I return an item if I change my mind?',
      a: changeOfMindLine(),
    },
    {
      q: 'What happens after you approve a report?',
      a: `${remedyLine()} ${transitLossLine()}`,
    },
    {
      q: 'How are refunds paid?',
      a: refundLine(),
    },
    {
      q: 'Can I cancel an order?',
      a: cancellationLine(),
    },
    {
      q: 'How do I contact COCO36?',
      a: `${contactLine()} ${supportHoursLine()} ${emailReplyLine()} COCO36 ships from ${SHIPS_FROM}.`,
    },
  ];
}

export const INFO_PAGES: InfoPage[] = [
  {
    path: '/about',
    title: 'About COCO36: Specialty Ingredients from Origin | COCO36',
    description: () => 'COCO36 Foods sells specialty baking and pastry ingredients sourced direct from origin, and ships them across India from Visakhapatnam.',
    crumb: 'About',
    eyebrow: 'The company',
    h1: 'Specialty baking ingredients, sourced direct from origin',
    sections: (policy) => [
      {
        heading: 'What COCO36 is',
        paragraphs: [
          'COCO36 Foods Pvt Ltd sells specialty baking and pastry ingredients to bakers, pastry chefs and chocolatiers across India. The ingredients are sourced direct from origin, from named makers and estates, never through anonymous brokers. The line under the name is from crop to craft.',
          'The shop brings together whole vanilla, unrefined cane sugars, speciality flours, finishing salt and kits. Where a product carries a certification, that mark is shown on the product, and the sourcing team sets it for that product. This page does not add a certification the product page does not already show.',
          'Ingredient guides sit next to the shop. They explain how vanilla, cocoa and chocolate, sugars, flours, and spices and salt are grown, made and stored. Those guides are general knowledge about the ingredients. The product page is where the facts of a specific item live. The homepage is the short introduction. The shop is the full catalogue.',
        ],
      },
      {
        heading: 'How an order leaves',
        paragraphs: [
          `${dispatchLine()} We ship across India. ${shippingPriceLine(policy)}`,
          `${businessDaysLine()} ${cutoffLine()} Two business days is when the order leaves Visakhapatnam, not a promised delivery date. Times after dispatch are estimates, and they are on the shipping page.`,
        ],
        todo: 'Add a short company story if you want this page to go beyond the homepage: when COCO36 started, and who you sell to besides bakers, pastry chefs and chocolatiers. Do not add a street address unless you want it public.',
      },
      {
        heading: 'If something is wrong with an item',
        paragraphs: [
          `${returnsLine(policy)} ${contactLine()}`,
          'The returns page sets out the photos we need, replacements, refunds and cancellations. The shipping page sets out the cutoff, delivery estimates and pincodes.',
        ],
      },
    ],
    related: relatedExcept('/about'),
  },
  {
    path: '/contact',
    title: 'Contact COCO36 Foods: Email and Phone Support | COCO36',
    description: () => 'Contact COCO36 at support@coco36.com or on 9944213233. We ship specialty baking ingredients from Visakhapatnam, Andhra Pradesh.',
    crumb: 'Contact',
    eyebrow: 'Support',
    h1: 'Contact COCO36',
    showContactList: true,
    sections: (policy) => [
      {
        paragraphs: [
          `Questions about an order, a product or a delivery come to ${SUPPORT_EMAIL} and to ${SUPPORT_PHONE_DISPLAY}. Use either. If the question is about an order you have already placed, include the order number so we can find it.`,
          `Write or call about an order that has shipped, an ingredient in the catalogue, or an item that arrived damaged, wrong, missing, or expired or near expiry. ${returnsLine(policy)} ${dispatchLine()} ${shippingPriceLine(policy)}`,
          `${supportHoursLine()} ${emailReplyLine()}`,
          `COCO36 ships from ${SHIPS_FROM}. That is the city we publish. The catalogue is specialty baking and pastry ingredients sourced direct from origin, for bakers, pastry chefs and chocolatiers across India.`,
          'If you are deciding what to buy, the shop lists every ingredient, and the ingredient guides explain vanilla, cocoa and chocolate, sugars, flours, and spices and salt. This page is how to reach a person. The FAQ, shipping page and returns page say the same things about orders.',
        ],
      },
    ],
    related: relatedExcept('/contact'),
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions about COCO36 Orders | COCO36',
    description: (policy) => `How COCO36 shipping works: dispatch within ${HANDLING_DAYS_MAX} business days from Visakhapatnam, free shipping over ${rupeesLabel(policy)}, and the ${policy.returnWindowDays}-day report window.`,
    crumb: 'FAQ',
    eyebrow: 'Help',
    h1: 'Orders, shipping and returns',
    sections: () => [
      {
        paragraphs: [
          'These are the answers on dispatch, delivery estimates, shipping cost, returns, refunds, cancellations and how to reach us. The shipping and returns pages say the same things in full.',
        ],
      },
    ],
    faqs: policyFaqs,
    related: relatedExcept('/faq'),
  },
  {
    path: '/shipping',
    title: 'COCO36 Shipping: From Visakhapatnam, India | COCO36',
    description: (policy) => `COCO36 ships within ${HANDLING_DAYS_MAX} business days from Visakhapatnam via our courier partners. Free on orders of ${rupeesLabel(policy)} or more; ${feeLabel(policy)} below that.`,
    crumb: 'Shipping',
    eyebrow: 'Delivery',
    h1: 'Shipping from Visakhapatnam',
    sections: (policy) => [
      {
        heading: 'When an order ships',
        paragraphs: [
          `${dispatchLine()} We ship across India.`,
          `${businessDaysLine()} ${cutoffLine()}`,
          'Two business days is when the order leaves Visakhapatnam. It is not a date for when the parcel reaches you.',
        ],
        bullets: [
          'Leaves from Visakhapatnam, Andhra Pradesh.',
          'Handed to our courier partners.',
          `Dispatched within ${HANDLING_DAYS_MAX} business days, using the 12 PM IST cutoff.`,
          'We ship across India.',
        ],
      },
      {
        heading: 'What shipping costs',
        paragraphs: [
          shippingPriceLine(policy),
          'The threshold is the order amount. At or above it, shipping is free. Below it, the shipping charge is the flat fee. The figure used at checkout is the one that applies when you pay.',
        ],
      },
      {
        heading: 'After the parcel leaves',
        paragraphs: [deliveryEstimateLine()],
        bullets: [
          '3 to 5 business days to metro cities.',
          '5 to 8 business days to the rest of India.',
          'Up to 10 business days for remote areas, including the North-East, J&K, and the Andaman & Nicobar and Lakshadweep islands.',
          'These are estimates, not guarantees.',
        ],
      },
      {
        heading: 'Pincodes',
        paragraphs: [serviceabilityLine()],
      },
      {
        heading: 'Tracking',
        paragraphs: [trackingLine()],
      },
    ],
    related: relatedExcept('/shipping'),
  },
  {
    path: '/returns',
    title: 'Returns: Damaged, Wrong, Missing or Expired | COCO36',
    description: (policy) => `Report a damaged, wrong, missing, expired or near-expiry COCO36 item within ${policy.returnWindowDays} days, with your order number and photos.`,
    crumb: 'Returns',
    eyebrow: 'After delivery',
    h1: 'Damaged, wrong, missing or expired items',
    sections: (policy) => [
      {
        heading: 'What you can report',
        paragraphs: [
          reportLine(policy),
          changeOfMindLine(),
        ],
      },
      {
        heading: 'After we approve a report',
        paragraphs: [
          remedyLine(),
          transitLossLine(),
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [refundLine()],
      },
      {
        heading: 'Cancellations',
        paragraphs: [cancellationLine()],
      },
    ],
    related: [...relatedExcept('/returns'), { href: '/terms', label: 'Terms of sale' }],
  },
];

export const INFO_BY_PATH: Record<string, InfoPage> = Object.fromEntries(
  INFO_PAGES.map((p) => [p.path, p]),
);

export function infoPage(path: string): InfoPage | undefined {
  return INFO_BY_PATH[path];
}

/** Every owner placeholder, for the review list and the tests. */
export function infoTodos(path: string): string[] {
  const page = infoPage(path);
  if (!page) return [];
  return page.sections({ freeShippingPaise: 120000, flatShippingPaise: 9900, codSurchargePaise: 0, returnWindowDays: 7 })
    .map((s) => s.todo)
    .filter((t): t is string => !!t);
}

function rupeesLabel(policy: StorePolicy): string {
  return shippingPriceLine(policy).match(/₹[\d,]+/)?.[0] ?? '';
}

function feeLabel(policy: StorePolicy): string {
  const found = shippingPriceLine(policy).match(/₹[\d,]+/g);
  return found?.[1] ?? '';
}
