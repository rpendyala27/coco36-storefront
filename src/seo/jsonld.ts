import type {
  BreadcrumbList, FAQPage, MerchantReturnPolicy, Offer, OfferShippingDetails,
  Organization, Product as SchemaProduct, WebSite, WithContext,
} from 'schema-dts';
import type { Product } from '../types';
import { imageUrl } from '../lib/img.js';
import { productPath } from '../lib/productPath.js';
import { stripMarkdown } from './text.js';
import {
  BRAND, DEFAULT_POLICY, LEGAL_NAME, LOGO_URL, dispatchDayBounds, dispatchWindow,
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
 * One year from `now` (UTC calendar date). Tells a crawler how long to treat
 * the listed price as current. It is not a restock date, and the price itself
 * still comes from the live catalogue.
 */
export const PRICE_VALID_DAYS = 365;

export function offerPriceValidUntil(now: Date, days = PRICE_VALID_DAYS): string {
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

/** The catalogue SKU, only when every pack is the same single code. */
function productSku(p: Product): string | undefined {
  const skus = [...new Set(p.sizes.map((s) => s.sku).filter((s): s is string => Boolean(s)))];
  return skus.length === 1 ? skus[0] : undefined;
}
/**
 * Domestic shipping: flat fee below the free-shipping threshold, free at or
 * above it. Handling time follows DISPATCH_WINDOW.
 * Transit time is the envelope published on /shipping (3–10 business days,
 * metro through remote). It is an estimate, not a guaranteed delivery date.
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
    shippingOrigin: { '@type': 'DefinedRegion', addressCountry: 'IN' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: dispatchDayBounds(dispatchWindow(policy)).min,
        maxValue: dispatchDayBounds(dispatchWindow(policy)).max,
        unitCode: 'DAY',
      },
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
  opts: {
    policy?: StorePolicy;
    reviews?: ReviewSummary;
    /** Plain visible intro, when an editorial page replaces the catalogue sentence. */
    description?: string;
    /** Pack contents we can name. No GTIN, MPN or measured weight we do not have. */
    additionalProperty?: readonly { name: string; value: string }[];
    /** Clock for priceValidUntil. Defaults to the current time. */
    now?: Date;
  } = {},
): WithContext<SchemaProduct> {
  const policy = opts.policy ?? DEFAULT_POLICY;
  const url = `${SITE_ORIGIN}${productPath(p)}`;
  const imgs = (p.images?.length ? p.images.map((i) => i.url) : [p.image]).filter(Boolean).slice(0, 4);
  const description = (opts.description?.trim() || stripMarkdown(p.description || p.tag || p.name)).slice(0, 5000);
  const returnPolicy = returnPolicyJsonLd(policy);
  const validUntil = offerPriceValidUntil(opts.now ?? new Date());
  const sku = productSku(p);
  const weights = p.sizes.flatMap((s) => {
    const w = netWeightFromLabel(s.label);
    return w ? [{ label: s.label, ...w }] : [];
  });
  const properties = [
    ...(opts.additionalProperty ?? []).map((prop) => ({
      '@type': 'PropertyValue' as const,
      name: prop.name,
      value: prop.value,
    })),
    ...weights.map((w) => ({
      '@type': 'PropertyValue' as const,
      name: 'Net weight',
      value: w.value,
      unitCode: w.unitCode,
      unitText: w.unitText,
      description: w.label,
    })),
  ];

  const offers: Offer[] = p.sizes.map((s) => {
    const weight = netWeightFromLabel(s.label);
    return {
      '@type': 'Offer',
      name: s.label,
      ...(s.sku ? { sku: s.sku } : {}),
      url,
      price: paiseToRupees(s.priceInPaise),
      priceCurrency: 'INR',
      priceValidUntil: validUntil,
      availability: s.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', '@id': ORG_ID, name: BRAND },
      shippingDetails: shippingJsonLd(s.priceInPaise, policy),
      hasMerchantReturnPolicy: returnPolicy,
      ...(weight ? {
        additionalProperty: {
          '@type': 'PropertyValue' as const,
          name: 'Net weight',
          value: weight.value,
          unitCode: weight.unitCode,
          unitText: weight.unitText,
        },
      } : {}),
    };
  });

  // Ratings are emitted only when a caller passes real reviews. Nothing in the
  // storefront does: there is no reviews table, and Product.rating on the
  // static demo catalogue is not a source.
  const reviews = opts.reviews && opts.reviews.reviewCount > 0 ? opts.reviews : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    url,
    ...(sku ? { sku } : {}),
    ...(imgs.length ? { image: imgs.map((u) => imageUrl(u, 1200)) } : {}),
    description,
    brand: { '@type': 'Brand', name: p.brand || BRAND },
    ...(p.category ? { category: p.category } : {}),
    ...(p.originCountry ? { countryOfOrigin: { '@type': 'Country', name: p.originCountry } } : {}),
    ...(weights.length === 1 ? {
      weight: { '@type': 'QuantitativeValue' as const, value: weights[0].value, unitCode: weights[0].unitCode },
    } : {}),
    ...(properties.length ? { additionalProperty: properties } : {}),
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
