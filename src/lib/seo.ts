import { useEffect } from 'react';
import { ogImageFor, serializeJsonLd, type PageMeta } from '../seo/meta';
import { SITE_ORIGIN } from '../seo/site';

/**
 * Client-side <head> manager. The server (api/render.ts) already sends the
 * right head for the first URL; this keeps it right as the SPA navigates.
 * Both sides build from the same PageMeta (src/seo/meta.ts).
 *
 * JSON-LD scripts are keyed by `data-seo="<id>"` on both sides, so the
 * server-rendered blocks are replaced in place, never duplicated.
 */

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content == null) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonical(href: string | null): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href == null) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export function applyMeta(m: PageMeta): void {
  const url = m.path ? SITE_ORIGIN + m.path : null;
  const image = ogImageFor(m);

  document.title = m.title;
  upsertMeta('name', 'description', m.description);
  upsertMeta('name', 'robots', m.robots ?? null);
  upsertCanonical(url);

  upsertMeta('property', 'og:title', m.title);
  upsertMeta('property', 'og:description', m.description);
  upsertMeta('property', 'og:type', m.ogType ?? 'website');
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:alt', m.imageAlt ?? m.title);
  // Dimensions are only known for the default 1200×630 card.
  const isDefault = !m.image;
  upsertMeta('property', 'og:image:width', isDefault ? '1200' : null);
  upsertMeta('property', 'og:image:height', isDefault ? '630' : null);
  upsertMeta('name', 'twitter:title', m.title);
  upsertMeta('name', 'twitter:description', m.description);
  upsertMeta('name', 'twitter:image', image);

  const keep = new Set(m.jsonLd.map((b) => b.id));
  document.head.querySelectorAll<HTMLScriptElement>('script[data-seo]').forEach((el) => {
    if (!keep.has(el.dataset.seo ?? '')) el.remove();
  });
  for (const block of m.jsonLd) {
    let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${block.id}"]`);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.seo = block.id;
      document.head.appendChild(el);
    }
    const text = serializeJsonLd(block.data);
    if (el.textContent !== text) el.textContent = text;
  }
}

/**
 * Apply `meta` whenever its content changes. Pass null while data is loading
 * to leave the current head alone (avoids flashing a placeholder title).
 */
export function useSeo(meta: PageMeta | null): void {
  const key = meta ? JSON.stringify(meta) : '';
  useEffect(() => {
    if (meta) applyMeta(meta);
    // `key` captures every field of meta; the object identity doesn't matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
