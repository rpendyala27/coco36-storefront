import type {
  BreadcrumbList, FAQPage, MerchantReturnPolicy, Offer, OfferShippingDetails,
  Organization, Product as SchemaProduct, WebSite, WithContext,
} from 'schema-dts';
import type { Product } from '../types';
import { imageUrl } from '../lib/img.js';
import { productPath } from '../lib/productPath.js';
import { stripMarkdown } from './text.js';
import {
  BRAND, DEFAULT_POLICY, HANDLING_DAYS_MAX, LEGAL_NAME, LOGO_URL, ORG_ADDRESS,
  SITE_ORIGIN, SOCIAL_PROFILES, TRANSIT_DAYS_MAX, TRANSIT_DAYS_MIN, type StorePolicy, absUrl,
} from './site.js';

/**
 * schema.org JSON-LD builders. Typed with `schema-dts` (Google's schema.org
 * typings), so a misspelt or non-existent property fails `npm run lint`.
 * Shared by the render function (server HTML) and the SPA (client head), so
 * both emit byte-identical structured data.
 */

const ORG_ID     = `${SITE_ORIGIN}/#org`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const paiseToRupees = (paise: number) => (paise / 100).toFixed(2);

/** One crumb: name + canonical path. */
export interface Crumb { name: string; path: string }

/** Returns are accepted within the window for damaged, wrong or expired items only
 *  (see /returns). No change-of-mind returns on food. */
export function returnPolicyJsonLd(policy: StorePolicy = DEFAULT_POLICY): MerchantReturnPolicy {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'IN',
    returnPolicyCountry: 'IN',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: policy.returnWindowDays,
    returnMethod: 'https://schema.org/ReturnByMail',
    merchantReturnLink: `${SITE_ORIGIN}/returns`,
  };
}

/**
 * How long the rendered price stays in the structured data. The catalogue has
 * no price-expiry column, so this is a publication horizon, not a sale end and
 * not a restock date. The price and availability on the offer are still the
 * live variant, refreshed on the next render.
 */
export const PRICE_VALID_DAYS = 365;

/** ISO date `days` after `now` (UTC calendar date). */
export function priceValidUntil(now = new Date(), days = PRICE_VALID_DAYS): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Net weight from a pack label such as "250 g" or "1 kg". Anything else is unknown. */
export function netWeightFromLabel(label: string): { value: number; unitCode: 'GRM' | 'KGM'; unitText: 'g' | 'kg' } | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return m[2].toLowerCase() === 'kg'
    ? { value, unitCode: 'KGM', unitText: 'kg' }
    : { value, unitCode: 'GRM', unitText: 'g' };
}

/**
 * Domestic shipping: flat fee below the free-shipping threshold, free at or
 * above it. Handling time is the "ships in 2 business days" promise.
 * Transit time is the published estimate on /shipping (metros through remote
 * areas), not a guarantee and not a per-pincode ETA.
 */
export function shippingJsonLd(pricePaise: number, policy: StorePolicy = DEFAULT_POLICY): OfferShippingDetails {
  const free = pricePaise >= policy.freeShippingPaise;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: free ? 0 : Number(paiseToRupees(policy.flatShippingPaise)),
      currency: 'INR',
    },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
    shippingOrigin: {
      '@type': 'DefinedRegion',
      addressCountry: ORG_ADDRESS.addressCountry,
      addressRegion: ORG_ADDRESS.addressRegion,
      postalCode: ORG_ADDRESS.postalCode,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: HANDLING_DAYS_MAX, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: TRANSIT_DAYS_MIN, maxValue: TRANSIT_DAYS_MAX, unitCode: 'DAY' },
    },
  };
}

/** Homepage Organization. */
export function organizationJsonLd(policy: StorePolicy = DEFAULT_POLICY): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: LEGAL_NAME,
    legalName: LEGAL_NAME,
    alternateName: BRAND,
    url: `${SITE_ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: LOGO_URL, width: '256', height: '250' },
    address: { '@type': 'PostalAddress', ...ORG_ADDRESS },
    ...(SOCIAL_PROFILES.length ? { sameAs: [...SOCIAL_PROFILES] } : {}),
    hasMerchantReturnPolicy: returnPolicyJsonLd(policy),
  };
}

export function websiteJsonLd(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BRAND,
    url: `${SITE_ORIGIN}/`,
    inLanguage: 'en-IN',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absUrl(c.path),
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** Real review data only — there is no reviews table yet, so nothing passes this. */
export interface ReviewSummary { ratingValue: number; reviewCount: number }

/**
 * schema.org Product. One Offer per variant (merchant listings don't accept
 * AggregateOffer), each with INR price, availability, seller, shipping and
 * return policy. aggregateRating is emitted ONLY when real `reviews` are passed.
 */
export function productJsonLd(
  p: Product,
  opts: { policy?: StorePolicy; reviews?: ReviewSummary; description?: string; contents?: string } = {},
): WithContext<SchemaProduct> {
  const policy = opts.policy ?? DEFAULT_POLICY;
  const url = `${SITE_ORIGIN}${productPath(p)}`;
  const imgs = (p.images?.length ? p.images.map((i) => i.url) : [p.image]).filter(Boolean).slice(0, 4);
  const description = stripMarkdown(opts.description || p.description || p.tag || p.name).slice(0, 5000);
  const returnPolicy = returnPolicyJsonLd(policy);
  const until = priceValidUntil();

  const offers: Offer[] = p.sizes.map((s) => ({
    '@type': 'Offer',
    name: s.label,
    ...(s.sku ? { sku: s.sku } : {}),
    url,
    price: paiseToRupees(s.priceInPaise),
    priceCurrency: 'INR',
    priceValidUntil: until,
    availability: s.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', '@id': ORG_ID, name: BRAND },
    shippingDetails: shippingJsonLd(s.priceInPaise, policy),
    hasMerchantReturnPolicy: returnPolicy,
  }));

  // One SKU on the product only when every pack shares that single code.
  // Packs with different SKUs keep the code on the Offer. No GTIN or MPN:
  // the catalogue does not store either.
  const skus = [...new Set(p.sizes.map((s) => s.sku).filter((s): s is string => Boolean(s)))];
  const weights = p.sizes.flatMap((s) => {
    const w = netWeightFromLabel(s.label);
    return w ? [{ label: s.label, ...w }] : [];
  });
  const additionalProperty = [
    ...weights.map((w) => ({
      '@type': 'PropertyValue' as const,
      name: 'Net weight',
      value: w.value,
      unitCode: w.unitCode,
      unitText: w.unitText,
      description: w.label,
    })),
    ...(opts.contents ? [{ '@type': 'PropertyValue' as const, name: 'Contents', value: opts.contents }] : []),
  ];

  const reviews = opts.reviews && opts.reviews.reviewCount > 0 ? opts.reviews : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    url,
    ...(skus.length === 1 ? { sku: skus[0] } : {}),
    ...(imgs.length ? { image: imgs.map((u) => imageUrl(u, 1200)) } : {}),
    description,
    brand: { '@type': 'Brand', name: p.brand || BRAND },
    ...(p.category ? { category: p.category } : {}),
    ...(p.originCountry ? { countryOfOrigin: { '@type': 'Country', name: p.originCountry } } : {}),
    ...(weights.length === 1 ? {
      weight: { '@type': 'QuantitativeValue', value: weights[0].value, unitCode: weights[0].unitCode },
    } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),
    ...(offers.length ? { offers } : {}),
    ...(reviews ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviews.ratingValue,
        reviewCount: reviews.reviewCount,
      },
    } : {}),
  };
}
