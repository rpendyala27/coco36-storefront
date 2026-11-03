import { guideFaqs, guidePath, type Guide } from '../content/guides.js';
import { faqJsonLd } from './jsonld.js';
import { crumbsLd, guideCrumbs, type PageMeta } from './meta.js';
import { DEFAULT_POLICY, type StorePolicy } from './site.js';

/**
 * Head for an ingredient guide: title, description, canonical, FAQPage +
 * BreadcrumbList JSON-LD. Separate from ./meta so the guide bodies stay out of
 * the main bundle (only the Guide page chunk and the server import this).
 */
export function guideMeta(g: Guide, policy: StorePolicy = DEFAULT_POLICY): PageMeta {
  return {
    title: g.title,
    description: g.description,
    path: guidePath(g),
    ogType: 'article',
    jsonLd: [
      { id: 'faq', data: faqJsonLd(guideFaqs(g, policy)) },
      crumbsLd(guideCrumbs(g)),
    ],
  };
}
