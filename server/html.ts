import { ogImageFor, serializeJsonLd, type PageMeta } from '../src/seo/meta.js';
import { BRAND, SITE_ORIGIN } from '../src/seo/site.js';

/**
 * HTML string helpers for the render function. Everything that lands in the
 * page from the database goes through esc()/attr().
 *
 * Server-only code: relative imports carry `.js` because the function runs as
 * native Node ESM (see package.json "type": "module"), which needs extensions.
 */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string | number | null | undefined) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const attr = esc;

/** The <head> block that replaces <!--seo:head-->…<!--/seo:head-->. Attribute
 *  names match what lib/seo.ts upserts client-side, so the SPA updates these
 *  exact tags in place. */
export function renderHead(m: PageMeta): string {
  const url = m.path ? SITE_ORIGIN + m.path : null;
  const image = ogImageFor(m);
  const lines = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${attr(m.description)}" />`,
    url && `<link rel="canonical" href="${attr(url)}" />`,
    m.robots && `<meta name="robots" content="${attr(m.robots)}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:type" content="${attr(m.ogType ?? 'website')}" />`,
    `<meta property="og:title" content="${attr(m.title)}" />`,
    `<meta property="og:description" content="${attr(m.description)}" />`,
    url && `<meta property="og:url" content="${attr(url)}" />`,
    `<meta property="og:image" content="${attr(image)}" />`,
    `<meta property="og:image:alt" content="${attr(m.imageAlt ?? m.title)}" />`,
    !m.image && `<meta property="og:image:width" content="1200" />`,
    !m.image && `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${attr(m.title)}" />`,
    `<meta name="twitter:description" content="${attr(m.description)}" />`,
    `<meta name="twitter:image" content="${attr(image)}" />`,
    `<meta name="twitter:image:alt" content="${attr(m.imageAlt ?? m.title)}" />`,
    ...m.jsonLd.map((b) => `<script type="application/ld+json" data-seo="${attr(b.id)}">${serializeJsonLd(b.data)}</script>`),
  ];
  return lines.filter(Boolean).map((l) => `    ${l}`).join('\n');
}

const HEAD_RE = /<!--seo:head-->[\s\S]*?<!--\/seo:head-->/;
const BODY_MARK = '<!--ssr-->';

/** True when the built template still has both injection points. */
export function isTemplate(html: string): boolean {
  return HEAD_RE.test(html) && html.includes(BODY_MARK);
}

/** Swap the head block and drop the snapshot into #root. */
export function inject(template: string, head: string, body: string): string {
  return template
    .replace(HEAD_RE, () => `<!--seo:head-->\n${head}\n    <!--/seo:head-->`)
    .replace(BODY_MARK, () => body);
}
