import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../lib/supportContact.js';
import { HANDLING_DAYS_MAX, SHIPS_FROM, type StorePolicy } from '../seo/site.js';
import {
  contactLine, dispatchLine, returnsLine, shippingPriceLine,
} from './orderFacts.js';

/**
 * Indexable info pages. Copy may only restate the homepage (who COCO36 is,
 * what it sells, ships across India) plus the four order facts in orderFacts.ts.
 * Gaps are `todo` strings, rendered as "TODO for the owner" callouts.
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
      a: `${dispatchLine()} We ship across India.`,
    },
    {
      q: 'How much does shipping cost?',
      a: shippingPriceLine(policy),
    },
    {
      q: 'What if an item arrives damaged, wrong or expired?',
      a: `${returnsLine(policy)} ${contactLine()}`,
    },
    {
      q: 'How do I contact COCO36?',
      a: `${contactLine()} COCO36 ships from ${SHIPS_FROM}.`,
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
          'Two business days is the time until an order ships, not a promise about the day it arrives. The carrier is Shiprocket. The city it leaves from is Visakhapatnam, in Andhra Pradesh.',
        ],
        todo: 'Add a short company story if you want this page to go beyond the homepage: when COCO36 started, and who you sell to besides bakers, pastry chefs and chocolatiers. Do not add a street address unless you want it public.',
      },
      {
        heading: 'If something is wrong with an item',
        paragraphs: [
          `${returnsLine(policy)} ${contactLine()}`,
          'The shipping page and the returns page spell those two points out on their own, with room marked for the details this site does not state yet, such as transit time by region and how a refund is paid.',
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
          `Write or call about an order that has shipped, an ingredient in the catalogue, or an item that arrived damaged, wrong or expired. ${returnsLine(policy)} ${dispatchLine()} ${shippingPriceLine(policy)}`,
          `COCO36 ships from ${SHIPS_FROM}. That is the city we publish. The catalogue is specialty baking and pastry ingredients sourced direct from origin, for bakers, pastry chefs and chocolatiers across India.`,
          'If you are deciding what to buy, the shop lists every ingredient, and the ingredient guides explain vanilla, cocoa and chocolate, sugars, flours, and spices and salt. This page is only the way to reach a person. The FAQ answers the shipping and returns questions in short form. The shipping and returns pages carry the same facts, with notes where a detail still needs the owner.',
        ],
        todo: 'State the hours the phone is answered, and how quickly email is answered.',
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
          'These are the questions we can answer from the facts already on the homepage: where an order ships from, what shipping costs, what to do about a damaged, wrong or expired item, and how to reach us. Anything past that is marked on the shipping and returns pages for the owner, and it is not listed here.',
        ],
      },
    ],
    faqs: policyFaqs,
    related: relatedExcept('/faq'),
  },
  {
    path: '/shipping',
    title: 'COCO36 Shipping: From Visakhapatnam, India | COCO36',
    description: (policy) => `COCO36 ships within ${HANDLING_DAYS_MAX} business days from Visakhapatnam, Andhra Pradesh, via Shiprocket. Free on orders of ${rupeesLabel(policy)} or more; ${feeLabel(policy)} below that.`,
    crumb: 'Shipping',
    eyebrow: 'Delivery',
    h1: 'Shipping from Visakhapatnam',
    sections: (policy) => [
      {
        heading: 'When an order ships',
        paragraphs: [
          dispatchLine(),
          'That is a dispatch time. It counts business days until the order leaves Visakhapatnam, Andhra Pradesh. It is not a date for when the parcel reaches you. The carrier is Shiprocket.',
        ],
        bullets: [
          'Leaves from Visakhapatnam, Andhra Pradesh.',
          'Handed to Shiprocket.',
          `Ships within ${HANDLING_DAYS_MAX} business days.`,
          'We ship across India.',
        ],
      },
      {
        heading: 'What shipping costs',
        paragraphs: [
          shippingPriceLine(policy),
          'The threshold is the order amount. At or above it, shipping is free. Below it, the shipping charge is the flat fee. The figure used at checkout is the one that applies when you pay.',
        ],
        todo: 'State the order cutoff time that still dispatches within 2 business days, and which days count as business days.',
      },
      {
        heading: 'After the parcel leaves',
        paragraphs: [
          'How long Shiprocket takes after collection depends on the route. This page does not publish a transit time, because we will not print a number we cannot stand behind.',
        ],
        todo: 'State delivery time after handoff to Shiprocket, including any difference by region or pincode. Do not publish a number until it is one COCO36 will stand behind.',
      },
      {
        todo: 'List any Indian pincodes or regions Shiprocket does not serve for COCO36, if there are any.',
      },
    ],
    related: relatedExcept('/shipping'),
  },
  {
    path: '/returns',
    title: 'Returns for Damaged, Wrong or Expired Items | COCO36',
    description: (policy) => `Report damaged, wrong or expired COCO36 items within ${policy.returnWindowDays} days of delivery. Email support@coco36.com or call 9944213233.`,
    crumb: 'Returns',
    eyebrow: 'After delivery',
    h1: 'Damaged, wrong or expired items',
    sections: (policy) => [
      {
        heading: 'What you can report',
        paragraphs: [
          returnsLine(policy),
          `Damaged means the item arrived damaged. Wrong means it is not the item you ordered. Expired means the item is expired. The window is measured from delivery, and it is ${policy.returnWindowDays} days. This page does not add other reasons.`,
        ],
      },
      {
        heading: 'How to tell us',
        paragraphs: [
          `${contactLine()} Say which order you mean. The shipping page covers how the order left Visakhapatnam. This page covers only the report after it arrives.`,
          'What we do after a report is not fully written here. The terms of sale are linked below so you can read them. The notes under this section are for the owner to complete before this wording is final.',
        ],
        todo: 'State what a report should include (for example an order number and photos) if you want that required, and confirm the address it should go to if it is not support@coco36.com or 9944213233.',
      },
      {
        heading: 'What we still need to publish',
        paragraphs: [
          'A returns page that stopped at the 7-day window would hide the practical questions. Those answers are not in the homepage facts, so they are marked here instead of being guessed.',
        ],
        todo: 'State how an approved refund is paid (original payment method, bank transfer, or store credit) and how many days it takes.',
      },
      {
        todo: 'State whether the remedy is a replacement, a refund, or the customer’s choice, and who pays return postage if the item has to come back.',
      },
      {
        todo: 'State whether items that arrive in good condition, including a change of mind, can be returned. Do not add this until you have decided.',
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
