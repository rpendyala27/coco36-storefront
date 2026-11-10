import type { Product } from '../types';
import type { Category, CategoryTree } from '../lib/categoryTree';
import { categoryPath, productPath } from '../lib/productPath.js';
import { imageUrl } from '../lib/img.js';
import { GUIDES_HUB, guidePath, type GuideLink } from '../content/guideIndex.js';
import {
  breadcrumbJsonLd, faqJsonLd, organizationJsonLd, productJsonLd, websiteJsonLd, type Crumb,
} from './jsonld.js';
import { INFO_PAGES, policyFaqs } from '../content/infoPages.js';
import { productPage } from '../content/productPages.js';
import { richPlain } from '../content/richText.js';
import { DEFAULT_OG_IMAGE, DEFAULT_POLICY, type StorePolicy, rupees } from './site.js';
import { DESCRIPTION_MAX, TITLE_MAX, clip, firstComplete, firstThatFits, fitSentences, sentence, sentences, stripMarkdown } from './text.js';

/**
 * Per-page <head> metadata. Every route's title, description, canonical,
 * robots, Open Graph image and JSON-LD is built HERE, once, and consumed by:
 *   - api/render.ts  → the HTML the server sends (crawlers, social scrapers)
 *   - lib/seo.ts     → the SPA head after client-side navigation
 * so the two can never disagree.
 */

export interface JsonLdBlock { id: string; data: object }

export interface PageMeta {
  title: string;
  description: string;
  /** Canonical path on https://coco36.com. Omitted only on error pages. */
  path?: string;
  robots?: string;
  ogType?: 'website' | 'product' | 'article';
  image?: string;
  imageAlt?: string;
  jsonLd: JsonLdBlock[];
}

export const NOINDEX = 'noindex, follow';

const HOME: Crumb = { name: 'Home', path: '/' };
const SHOP: Crumb = { name: 'Shop', path: '/shop' };

export const crumbsLd = (crumbs: Crumb[]): JsonLdBlock => ({ id: 'breadcrumb', data: breadcrumbJsonLd(crumbs) });

// ── Static routes ────────────────────────────────────────────────────────────

interface StaticEntry {
  title: string;
  description: (policy: StorePolicy) => string;
  /** Visible breadcrumb label; indexable pages get a BreadcrumbList. */
  crumb?: string;
  noindex?: boolean;
}

const STATIC_PAGES: Record<string, StaticEntry> = {
  // Indexable company / policy pages. Titles, descriptions and /faq answers
  // live in src/content/infoPages.ts so the head and the visible page match.
  ...Object.fromEntries(INFO_PAGES.map((p): [string, StaticEntry] => [p.path, {
    title: p.title,
    description: p.description,
    crumb: p.crumb,
  }])),
  '/36-steps': {
    title: 'The 36-Step Crop-to-Craft Traceability Method | COCO36',
    description: () => 'Six phases, thirty-six checkpoints: the crop-to-craft framework behind every COCO36 ingredient, from a named origin to your kitchen.',
    crumb: '36 Steps',
  },
  '/partnerships': {
    title: 'Ingredient Partnerships for Food Brands in India | COCO36',
    description: () => 'Custom cocoa blends, co-developed mixes, private label and technical support. COCO36 partners with food brands from concept to production.',
    crumb: 'Partnerships',
  },
  '/trade': {
    title: 'Wholesale & Bulk Baking Ingredients in India | COCO36',
    description: () => 'Bulk pricing, full documentation and consistent lots for kitchens, cafés, bakeries and brands across India. Apply for a COCO36 trade account.',
    crumb: 'Trade & wholesale',
  },
  '/impact': {
    title: 'Impact: Soil, Farmer Income & Traceability | COCO36',
    description: () => 'We are building COCO36 to measure success in soil health, fair farmer income and full traceability, not just kilos shipped. Read our commitments.',
    crumb: 'Impact',
  },
  '/privacy': {
    title: 'How COCO36 Foods Protects Your Personal Data | COCO36',
    description: () => 'How COCO36 Foods Pvt Ltd collects, uses and protects your personal data when you shop with us, and the choices you have.',
    crumb: 'Privacy',
  },
  '/terms': {
    title: 'Terms of Sale, Shipping & Returns | COCO36',
    description: (p) => `Terms of sale for COCO36: prices in INR including GST, Razorpay payments, shipping across India via our courier partners and our ${p.returnWindowDays}-day returns window.`,
    crumb: 'Terms of sale',
  },
  // ── Not for the index: thin, transactional or not-yet-built pages ──
  '/recipes': {
    title: 'Recipe Consultant: Coming Soon | COCO36',
    description: () => 'An AI recipe consultant for cooking and baking with COCO36 ingredients is on the way. Meanwhile, browse the shop and our ingredient guides.',
    noindex: true,
  },
  '/quick-order': {
    title: 'Quick Order | COCO36',
    description: () => 'Order COCO36 ingredients fast: choose sizes and quantities from a single list and check out in one step.',
    noindex: true,
  },
  '/auth':     { title: 'Sign In or Create an Account | COCO36', description: () => 'Sign in to your COCO36 account to check out faster, track orders and download invoices.', noindex: true },
  '/checkout': { title: 'Checkout | COCO36', description: () => 'Review your bag and place your COCO36 order.', noindex: true },
  '/account':  { title: 'Your Account | COCO36', description: () => 'Your COCO36 orders, invoices and saved addresses.', noindex: true },
  // Real page for the drawer cart. noindex: a utility URL, not a landing page.
  '/cart': { title: 'Your Shopping Cart | COCO36', description: () => 'Review the ingredients in your COCO36 cart, then continue to checkout or return to the shop.', noindex: true },
};

/** Visible + BreadcrumbList crumbs for an indexable static route, else null. */
export function staticPageCrumbs(pathname: string): Crumb[] | null {
  const e = STATIC_PAGES[pathname];
  return e?.crumb && !e.noindex ? [HOME, { name: e.crumb, path: pathname }] : null;
}

/** Meta for a static route, or null when `pathname` isn't one. */
export function staticPageMeta(pathname: string, policy: StorePolicy = DEFAULT_POLICY): PageMeta | null {
  const e = STATIC_PAGES[pathname];
  if (e) {
    const crumbs = staticPageCrumbs(pathname);
    const faqs = pathname === '/faq' ? policyFaqs(policy) : null;
    return {
      title: e.title,
      description: e.description(policy),
      path: pathname,
      ...(e.noindex ? { robots: NOINDEX } : {}),
      jsonLd: [
        ...(crumbs ? [crumbsLd(crumbs)] : []),
        ...(faqs ? [{ id: 'faq', data: faqJsonLd(faqs) }] : []),
      ],
    };
  }
  if (pathname.startsWith('/account/')) {
    return { title: 'Your Order | COCO36', description: 'Order details and invoice for your COCO36 order.', path: pathname, robots: NOINDEX, jsonLd: [] };
  }
  if (pathname.startsWith('/track/')) {
    return { title: 'Track Your Shipment | COCO36', description: 'Live shipment tracking for your COCO36 order.', path: pathname, robots: NOINDEX, jsonLd: [] };
  }
  return null;
}

/** True for paths whose page sets its own meta (dynamic data). */
export function isStaticMetaPath(pathname: string): boolean {
  return pathname in STATIC_PAGES || pathname.startsWith('/account/') || pathname.startsWith('/track/');
}

// ── Home / shop / guides ─────────────────────────────────────────────────────

export function homeMeta(policy: StorePolicy = DEFAULT_POLICY): PageMeta {
  return {
    title: 'COCO36 | Baking & Pastry Ingredients Online in India',
    description: `Origin ingredients for bakers and pastry chefs in India: vanilla, cane sugars, speciality flours and finishing salt. Free shipping over ${rupees(policy.freeShippingPaise)}.`,
    path: '/',
    ogType: 'website',
    jsonLd: [
      { id: 'organization', data: organizationJsonLd(policy) },
      { id: 'website', data: websiteJsonLd() },
    ],
  };
}

/**
 * Self-canonical at exactly https://coco36.com/shop (path `/shop`, no query).
 * Competing variants are collapsed in server/render.ts: trailing slash, empty
 * `?q=`, and legacy `?cat=` / `?category=` redirect; a non-empty `?q=` stays
 * noindex with this same canonical. `/catalog` 301s here from vercel.json.
 * The long intro (content/shopIntro.ts) is what separates this URL from the
 * homepage, which lists the same small catalogue.
 */
export function shopMeta(): PageMeta {
  return {
    title: 'Shop Baking & Pastry Ingredients in India | COCO36',
    description: 'The full COCO36 catalogue: specialty baking ingredients sourced direct from origin, from vanilla and cane sugars to flours, salt and kits.',
    path: '/shop',
    jsonLd: [crumbsLd([HOME, SHOP])],
  };
}

export function guidesHubMeta(): PageMeta {
  return {
    title: GUIDES_HUB.title,
    description: GUIDES_HUB.description,
    path: GUIDES_HUB.path,
    jsonLd: [crumbsLd([HOME, { name: 'Ingredient guides', path: GUIDES_HUB.path }])],
  };
}

export function guideCrumbs(g: GuideLink): Crumb[] {
  return [HOME, { name: 'Ingredient guides', path: GUIDES_HUB.path }, { name: g.name, path: guidePath(g) }];
}
// guideMeta lives in ./guideMeta (it needs the full guide bodies).

// ── Categories + products ────────────────────────────────────────────────────

export function categoryCrumbs(c: Category, tree: CategoryTree): Crumb[] {
  return [HOME, SHOP, ...tree.ancestorsOf(c.id).map((a) => ({ name: a.name, path: categoryPath(a) }))];
}

const buyTitle = (name: string) => firstThatFits([
  `${name} | Buy Online in India | COCO36`,
  `${name} Online in India | COCO36`,
  `${name} | COCO36 India`,
  `${name} | COCO36`,
], TITLE_MAX);

/** `products` = live products in the category's subtree. Empty → noindex. */
export function categoryMeta(c: Category, tree: CategoryTree, products: readonly Product[]): PageMeta {
  const names = products.slice(0, 3).map((p) => p.name).join(', ');
  const description = c.description
    ? clip(c.description, DESCRIPTION_MAX)
    : firstThatFits([
        `Shop ${c.name.toLowerCase()} at COCO36${names ? `: ${names}` : ''}. Shipped across India from Visakhapatnam.`,
        `Shop ${c.name.toLowerCase()} at COCO36. Shipped across India from Visakhapatnam.`,
      ], DESCRIPTION_MAX);
  return {
    title: buyTitle(c.name),
    description,
    path: categoryPath(c),
    ...(products.length === 0 ? { robots: NOINDEX } : {}),
    ...(c.imageUrl ? { image: imageUrl(c.imageUrl, 1200), imageAlt: c.name } : {}),
    jsonLd: [crumbsLd(categoryCrumbs(c, tree))],
  };
}

export function productCrumbs(p: Product, tree: CategoryTree): Crumb[] {
  const cats = p.categoryId ? tree.ancestorsOf(p.categoryId) : [];
  return [HOME, SHOP, ...cats.map((a) => ({ name: a.name, path: categoryPath(a) })), { name: p.name, path: productPath(p) }];
}

/**
 * Catalogue meta: whole sentences plus origin and price, longest first.
 * A sentence is never cut in half to make room for the price. The old clip
 * turned "Stone-ground in small batches." into "Stone-ground in…".
 */
function catalogueProductDescription(p: Product): string {
  const prices = p.sizes.map((s) => s.priceInPaise);
  const from = prices.length
    ? `${prices.length > 1 ? 'From ' : ''}${rupees(Math.min(...prices))}, shipped across India.`
    : 'Shipped across India.';
  const base = sentence(stripMarkdown(p.description || p.tag || p.name));
  const origin = p.originCountry ? `Origin: ${p.originCountry}.` : '';
  const chunks = sentences(base);
  const bodies: string[] = [];
  for (let n = chunks.length; n >= 1; n--) bodies.push(chunks.slice(0, n).join(' '));
  if (!bodies.length && base) bodies.push(base);
  const candidates: string[] = [];
  for (const body of bodies) {
    if (origin) candidates.push(`${body} ${origin} ${from}`);
    candidates.push(`${body} ${from}`);
  }
  candidates.push(from);
  return firstComplete(candidates, DESCRIPTION_MAX);
}

export function productMeta(p: Product, tree: CategoryTree, policy: StorePolicy = DEFAULT_POLICY, now: Date = new Date()): PageMeta {
  const page = productPage(p);
  const raw = page ? page.metaDescription : catalogueProductDescription(p);
  // Editorial metas are written as complete strings. If a price change pushes
  // one over the limit, drop a trailing sentence — do not insert an ellipsis.
  const description = raw.length <= DESCRIPTION_MAX ? raw : fitSentences(raw, DESCRIPTION_MAX);
  const faqs = page?.faqs.map((f) => ({ q: f.q, a: richPlain(f.a) })) ?? [];
  const intro = page ? richPlain(page.intro.join(' ')) : '';

  return {
    title: page && page.title.length <= TITLE_MAX ? page.title : buyTitle(p.name),
    description,
    path: productPath(p),
    ogType: 'product',
    ...(p.image ? { image: imageUrl(p.image, 1200), imageAlt: p.name } : {}),
    jsonLd: [
      { id: 'product', data: productJsonLd(p, {
        policy,
        now,
        ...(intro ? { description: intro } : {}),
        ...(page && page.properties.length ? { additionalProperty: page.properties } : {}),
      }) },
      crumbsLd(productCrumbs(p, tree)),
      ...(faqs.length ? [{ id: 'faq', data: faqJsonLd(faqs) }] : []),
    ],
  };
}

// ── Errors ───────────────────────────────────────────────────────────────────

export function notFoundMeta(): PageMeta {
  return {
    title: 'Page Not Found | COCO36',
    description: 'This page moved or never existed. Browse the COCO36 shop and ingredient guides instead.',
    robots: 'noindex',
    jsonLd: [],
  };
}

export function goneMeta(): PageMeta {
  return {
    title: 'Product No Longer Available | COCO36',
    description: 'This product has been discontinued. Browse the COCO36 shop for what is available now.',
    robots: 'noindex',
    jsonLd: [],
  };
}

/** Default Open Graph image when a page has none of its own. */
export const ogImageFor = (m: PageMeta) => m.image ?? DEFAULT_OG_IMAGE;

/** JSON for a <script type="application/ld+json">; `<` escaped so text can't close the tag. */
export const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');
