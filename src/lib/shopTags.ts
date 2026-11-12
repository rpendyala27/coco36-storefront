/** Shop tag facet, including Use & application, as a repeatable `?tag=` param. */

export function readTagSlugs(params: { getAll(name: string): string[] }): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of params.getAll('tag')) {
    const slug = raw.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export function withTagSlugs(params: URLSearchParams, slugs: Iterable<string>): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('tag');
  for (const slug of slugs) {
    const clean = slug.trim();
    if (clean) next.append('tag', clean);
  }
  return next;
}

export function shopTagPath(slug: string): string {
  return `/shop?tag=${encodeURIComponent(slug)}`;
}
