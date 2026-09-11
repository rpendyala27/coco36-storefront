/**
 * Product URL helpers.
 *
 * Product routes used to be bare UUIDs (`/shop/<uuid>`) — unreadable, bad for
 * SEO, and untrustworthy when shared. We now emit `/shop/<name-slug>-<uuid>`:
 * the slug carries the product name for humans and search engines, while the
 * UUID stays embedded at the end so links never collide and survive renames.
 * `idFromParam` pulls the id back out on the PDP.
 */

/** Lowercase, hyphenated, alphanumeric-only — the storefront's canonical slug style. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // any non-alphanum → hyphen
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Human- and SEO-readable product path: `/shop/<name-slug>-<uuid>`.
 * Falls back to the bare id when a name has no sluggable characters.
 */
export function productPath(p: { id: string; name?: string | null }): string {
  const slug = slugify(p.name ?? '');
  return slug ? `/shop/${slug}-${p.id}` : `/shop/${p.id}`;
}

/**
 * Resolve a `/shop/:id` route param back to a product id. Accepts a bare UUID
 * (legacy links + old JSON-LD), a `<slug>-<uuid>` combo (current), or a legacy
 * bare name-slug (returned unchanged so the caller's name-slug fallback runs).
 */
export function idFromParam(param: string): string {
  const m = param.match(UUID_RE);
  return m ? m[0] : param;
}
