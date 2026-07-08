import { useEffect } from 'react';
import type { Product } from '../types';
import { imageUrl } from './img';

/**
 * Structured-data + meta helpers for the SPA.
 *
 * Googlebot renders JavaScript, so JSON-LD injected client-side IS picked up
 * for rich results (unlike og: tags, which social scrapers read without
 * running JS — those stay static in index.html). Each script tag is keyed by
 * id so route changes replace rather than accumulate.
 */

const ORIGIN = 'https://coco36.com';

/** Upsert (or with `data: null`, remove) a JSON-LD script tag keyed by id. */
export function useJsonLd(id: string, data: object | null): void {
  useEffect(() => {
    const attr = `seo-${id}`;
    let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${attr}"]`);
    if (!data) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.seo = attr;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => { el?.remove(); };
  }, [id, data]);
}

/** Upsert <meta name="description">. Pass ~150–160 chars. */
export function setMetaDescription(text: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = text;
}

/** Markdown → plain text, roughly — good enough for meta/JSON-LD strings. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links → label
    .replace(/[#>*_`~]/g, '')                  // md punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

const paiseToRupees = (paise: number) => (paise / 100).toFixed(2);

/** schema.org Product with Offer/AggregateOffer built from the variants. */
export function productJsonLd(p: Product): object {
  const url = `${ORIGIN}/shop/${p.id}`;
  const inStock = p.sizes.some((s) => s.inStock);
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const prices = p.sizes.map((s) => s.priceInPaise);

  const offers = p.sizes.length > 1
    ? {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: paiseToRupees(Math.min(...prices)),
        highPrice: paiseToRupees(Math.max(...prices)),
        offerCount: p.sizes.length,
        availability,
        url,
      }
    : {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: paiseToRupees(prices[0] ?? 0),
        availability,
        url,
      };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: p.name,
    url,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.image ? { image: [imageUrl(p.image, 800)] } : {}),
    description: stripMarkdown(p.description || p.tag || '').slice(0, 500),
    brand: { '@type': 'Brand', name: p.brand || 'COCO36' },
    ...(p.category ? { category: p.category } : {}),
    offers,
  };
}

/** schema.org BreadcrumbList mirroring the PDP breadcrumb nav. */
export function productBreadcrumbJsonLd(p: Product): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${ORIGIN}/shop` },
      { '@type': 'ListItem', position: 2, name: p.category, item: `${ORIGIN}/shop?category=${encodeURIComponent(p.category)}` },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${ORIGIN}/shop/${p.id}` },
    ],
  };
}
