import { certLabel } from './certLabel';
import { isFssaiClaim } from './fssai';

/**
 * Trust-band marks from public.product_claims(). Fail closed: a missing or
 * failed read is no marks. Only claim types the RPC actually returned.
 */

export interface ClaimMark {
  slug: string;
  label: string;
}

export function marksFromClaims(rows: readonly { claim?: string | null }[] | null | undefined): ClaimMark[] {
  if (!rows) return [];
  const seen = new Set<string>();
  const out: ClaimMark[] = [];
  for (const row of rows) {
    const slug = String(row?.claim ?? '').trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    const label = certLabel(slug);
    if (!label || isFssaiClaim(slug, label)) continue;
    seen.add(slug);
    out.push({ slug, label });
  }
  return out;
}
