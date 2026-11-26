import type { ClaimMark } from '../lib/claimMarks';

const NONE: readonly ClaimMark[] = Object.freeze([]);

/**
 * Claim marks for the browser trust band. F14: public.product_claims() is no
 * longer called as anon (EXECUTE is being revoked from anon/public), so the
 * browser has no claims and shows no marks. Pass `marks` to TrustBand to
 * render a known list. `enabled` is kept for the existing call site.
 */
export function useClaimMarks(_enabled = true): ClaimMark[] {
  return NONE as ClaimMark[];
}
